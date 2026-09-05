import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import {
  StudioError,
  type DesignState,
  type Device,
  type Gate,
  type RequestType,
  type Screen,
  type ScreenSource,
  type StudioEvent,
  type StudioRequest,
} from "../shared/schema.ts";
import { newId, slugify, uniqueSlug } from "../shared/ids.ts";
import { describeFindings, lintTokenDrivenHtml } from "../shared/screen-lint.ts";
import { sha256 } from "../shared/hash.ts";
import { evaluatePairs, type ContrastResult } from "../shared/contrast.ts";
import {
  buildTokenModel,
  emitTailwindThemeCss,
  emitTokensCss,
  stripDarkTokens,
  tokensHash,
  type DesignFrontmatter,
  type TokenModel,
} from "../shared/tokens.ts";
import {
  designMdPath,
  previewPath,
  revisionDir,
  revisionRelative,
  tailwindThemePath,
  tokensCssPath,
} from "../shared/paths.ts";
import { DesignStore, computeGate, joinDesign, type MutationContext } from "./store.ts";
import { mergeTokens, readDesignMd, serializeDesignMd, writeDesignMd, writeFileAtomic } from "./design-md.ts";
import { readTemplate, renderPreview } from "./preview.ts";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_PNG_BYTES = 20 * 1024 * 1024;

export interface FilePayload {
  htmlPath?: string | undefined;
  htmlBase64?: string | undefined;
  pngPath?: string | undefined;
  pngBase64?: string | undefined;
}

export interface AddScreenInput extends FilePayload {
  title: string;
  device: Device;
  width: number;
  height: number;
  source: ScreenSource;
  tokenDriven?: boolean | undefined;
  parentId?: string | undefined;
  canvas?: { x: number; y: number } | undefined;
}

export interface UpdateScreenInput extends FilePayload {
  screenId: string;
  title?: string | undefined;
  source?: ScreenSource | undefined;
  tokenDriven?: boolean | undefined;
  width?: number | undefined;
  height?: number | undefined;
  ifRev?: number | undefined;
}

export interface DecisionInput {
  screenId: string;
  state: "approved" | "rejected";
  notes?: string | undefined;
  by: "human" | "agent";
  followUp?: RequestType | undefined;
  ifRev?: number | undefined;
}

/**
 * Everything that changes the project, in one place. HTTP routes and MCP tools
 * are thin wrappers over this, so both paths behave identically and there is
 * exactly one writer of `design/`.
 */
export class StudioService {
  readonly store: DesignStore;
  readonly projectRoot: string;

  constructor(store: DesignStore) {
    this.store = store;
    this.projectRoot = store.projectRoot;
  }

  state(): DesignState {
    return this.store.snapshot();
  }

  gate(): Gate {
    return this.store.gate();
  }

  /* ------------------------------------------------------------- tokens */

  async tokenModel(): Promise<{ model: TokenModel; frontmatter: DesignFrontmatter; designMd: string }> {
    const document = await readDesignMd(designMdPath(this.projectRoot));
    return {
      model: buildTokenModel(document.frontmatter),
      frontmatter: document.frontmatter,
      designMd: serializeDesignMd(document),
    };
  }

  async contrast(): Promise<ContrastResult[]> {
    const { model } = await this.tokenModel();
    const colors: Record<string, string> = { ...model.colorsLight };
    for (const [role, value] of Object.entries(model.colorsDark)) colors[`dark-${role}`] = value;
    return evaluatePairs(colors, this.state().contrastPairs);
  }

  /** Rewrites the frontmatter, regenerates every derived file, and stales the screens. */
  async setTokens(
    tokens: Record<string, unknown>,
    options: { ifRev?: number | undefined; queueReapply?: boolean } = {},
  ): Promise<{ tokensHash: string; rev: number; requestId?: string }> {
    const path = designMdPath(this.projectRoot);
    const document = await readDesignMd(path);
    const merged = mergeTokens(document, tokens);
    const model = buildTokenModel(merged.frontmatter);
    const hash = tokensHash(model);
    const previous = this.state().tokensHash;

    const designText = await writeDesignMd(path, merged);
    const generated = await this.regenerate(model, this.state(), merged.body);

    const queueReapply = options.queueReapply !== false && previous !== "" && previous !== hash;
    let requestId: string | undefined;

    const result = await this.store.mutate((context) => {
      context.state.tokensHash = hash;
      context.state.provenance = {
        ...context.state.provenance,
        "DESIGN.md": sha256(designText),
        "tokens.css": sha256(generated.tokensCss),
        "tailwind.theme.css": sha256(generated.tailwindCss),
        "preview.html": sha256(generated.previewHtml),
      };
      if (previous !== hash) {
        for (const screen of context.state.screens) {
          if (screen.tokenDriven) {
            // Derived, not captured: it repaints from the new tokens on reload.
            screen.staleTokens = false;
            continue;
          }
          // A screen captured under this exact token set is not stale, however
          // many edits it took to get back here.
          screen.staleTokens =
            screen.capturedTokensHash === undefined ? true : screen.capturedTokensHash !== hash;
        }
        context.emit("tokens_changed", { tokensHash: hash, previous });
      }
      if (queueReapply && context.state.screens.length > 0) {
        const request = createRequest("reapply_design_system", undefined, { tokensHash: hash });
        context.state.requests.push(request);
        requestId = request.id;
        context.emit("request_created", { requestId: request.id, type: request.type });
      }
      return undefined;
    }, options.ifRev);

    return requestId === undefined
      ? { tokensHash: hash, rev: result.state.rev }
      : { tokensHash: hash, rev: result.state.rev, requestId };
  }

  /** Writes tokens.css, tailwind.theme.css and preview.html from the model. */
  async regenerate(
    model: TokenModel,
    state: DesignState,
    body?: string,
  ): Promise<{ tokensCss: string; tailwindCss: string; previewHtml: string }> {
    const tokensCss = emitTokensCss(model);
    const tailwindCss = emitTailwindThemeCss(model);
    const template = await readTemplate("preview.template.html");
    const prose = body ?? (await readDesignMd(designMdPath(this.projectRoot))).body;
    const previewHtml = renderPreview({ template, model, state, body: prose });

    await writeFileAtomic(tokensCssPath(this.projectRoot), tokensCss);
    await writeFileAtomic(tailwindThemePath(this.projectRoot), tailwindCss);
    await writeFileAtomic(previewPath(this.projectRoot), previewHtml);
    return { tokensCss, tailwindCss, previewHtml };
  }

  /** The frontmatter as an external generator should see it: no `dark-` twins. */
  async stitchDesignMd(): Promise<string> {
    const document = await readDesignMd(designMdPath(this.projectRoot));
    return serializeDesignMd({
      frontmatter: stripDarkTokens(document.frontmatter),
      body: document.body,
    });
  }

  /* ------------------------------------------------------------ screens */

  /**
   * A token-driven screen is only trustworthy if the promise is checked, so a
   * screen that carries its own colours or reaches for a remote asset is
   * refused rather than quietly stored as something it is not.
   */
  private assertTokenDriven(html: Buffer | null | undefined, tokenDriven: boolean): void {
    if (!tokenDriven || html === null || html === undefined) return;
    const findings = lintTokenDrivenHtml(html.toString("utf8"));
    if (findings.length === 0) return;
    throw new StudioError(
      "E_INVALID_FILE",
      `a token-driven screen must render from var(--ls-*) and same-origin assets only: ${describeFindings(findings)}`,
      { findings: findings.slice(0, 20) },
    );
  }

  /**
   * The gate stamp records that one specific set of approved screens was
   * exported. Any change to that set makes the stamp a lie, and a consumer
   * reading `gates.screens.passed` would build from a handoff that no longer
   * matches the design. `computeGate` already derives `canPass` freshly; this
   * keeps the stored half honest too.
   */
  private invalidateGateStamp(context: MutationContext, reason: string): void {
    if (!context.state.gates.screens.passed) return;
    context.state.gates.screens = { passed: false };
    if (context.state.status === "approved") context.state.status = "screens";
    context.emit("gate_invalidated", { reason });
  }

  async addScreen(input: AddScreenInput): Promise<{ screen: Screen; rev: number }> {
    const html = await this.loadHtml(input);
    const png = await this.loadPng(input);
    if (!html || !png) {
      throw new StudioError("E_INVALID_FILE", "a new screen needs both an HTML file and a PNG file");
    }

    this.assertTokenDriven(html, input.tokenDriven ?? false);

    const state = this.state();
    const slug = uniqueSlug(slugify(input.title), state.screens.map((screen) => screen.slug));
    const revision = 1;
    await this.writeRevision(slug, revision, html, png);

    const canvas = input.canvas ?? defaultCanvas(state.screens, input.device);
    const screen: Screen = {
      id: newId("screen"),
      slug,
      title: input.title,
      device: input.device,
      width: input.width,
      height: input.height,
      source: input.source,
      revision,
      files: {
        html: revisionRelative(slug, revision, "code.html"),
        png: revisionRelative(slug, revision, "screen.png"),
        sha256: { html: sha256(html), png: sha256(png) },
      },
      decision: { state: "pending", notes: "" },
      tokenDriven: input.tokenDriven ?? false,
      staleTokens: false,
      canvas,
    };
    if (input.parentId !== undefined) screen.parentId = input.parentId;

    const result = await this.store.mutate((context) => {
      // Stamped inside the mutation so it always matches the committed tokens.
      screen.capturedTokensHash = context.state.tokensHash;
      context.state.screens.push(screen);
      this.invalidateGateStamp(context, "a screen was added after the gate passed");
      if (context.state.status === "draft" || context.state.status === "direction") {
        context.state.status = "screens";
      }
      context.emit("screen_added", { screenId: screen.id, slug: screen.slug });
      return undefined;
    });
    return { screen, rev: result.state.rev };
  }

  async updateScreen(input: UpdateScreenInput): Promise<{ screen: Screen; rev: number }> {
    const current = this.store.screen(input.screenId);
    const html = await this.loadHtml(input);
    const png = await this.loadPng(input);
    // The incoming revision decides what kind of screen this now is, so the
    // check runs against the new value rather than the previous one.
    const tokenDriven = input.tokenDriven ?? current.tokenDriven;
    this.assertTokenDriven(html, tokenDriven);
    const revision = html || png ? current.revision + 1 : current.revision;

    if (html || png) {
      const htmlBytes = html ?? (await readFile(joinDesign(this.projectRoot, current.files.html)));
      const pngBytes = png ?? (await readFile(joinDesign(this.projectRoot, current.files.png)));
      await this.writeRevision(current.slug, revision, htmlBytes, pngBytes);
      current.files = {
        html: revisionRelative(current.slug, revision, "code.html"),
        png: revisionRelative(current.slug, revision, "screen.png"),
        sha256: { html: sha256(htmlBytes), png: sha256(pngBytes) },
      };
      current.revision = revision;
      current.decision = { state: "pending", notes: "" };
      current.staleTokens = false;
    }
    if (input.title !== undefined) current.title = input.title;
    if (input.source !== undefined) current.source = input.source;
    if (input.width !== undefined) current.width = input.width;
    if (input.height !== undefined) current.height = input.height;
    current.tokenDriven = tokenDriven;

    const result = await this.store.mutate((context) => {
      const index = context.state.screens.findIndex((screen) => screen.id === input.screenId);
      if (index === -1) throw new StudioError("E_SCREEN_NOT_FOUND", `no screen ${input.screenId}`);
      if (html || png) {
        current.capturedTokensHash = context.state.tokensHash;
        this.invalidateGateStamp(context, "a screen was revised after the gate passed");
      }
      context.state.screens[index] = current;
      context.emit("screen_updated", { screenId: current.id, revision: current.revision });
      return undefined;
    }, input.ifRev);
    return { screen: current, rev: result.state.rev };
  }

  async setDecision(input: DecisionInput): Promise<{ rev: number; gate: Gate; requestId?: string }> {
    // The gate exists so a person confirms the design. An agent may reject a
    // screen that failed a check it ran, but approval is never delegated.
    if (input.state === "approved" && input.by === "agent") {
      throw new StudioError(
        "E_GATE_BLOCKED",
        "an agent cannot approve a screen; approval is the person's decision in the studio",
        { screenId: input.screenId },
      );
    }
    let requestId: string | undefined;
    const at = new Date().toISOString();

    const result = await this.store.mutate((context) => {
      const screen = context.state.screens.find((candidate) => candidate.id === input.screenId);
      if (!screen) throw new StudioError("E_SCREEN_NOT_FOUND", `no screen ${input.screenId}`);
      const notes = input.notes ?? "";
      screen.decision = { state: input.state, notes, at, by: input.by };
      if (input.state !== "approved") {
        this.invalidateGateStamp(context, "a screen was rejected after the gate passed");
      }
      context.state.approvals.push({
        at,
        screenId: screen.id,
        state: input.state,
        notes,
        by: input.by,
        revision: screen.revision,
      });
      context.emit(input.state === "approved" ? "screen_approved" : "screen_rejected", {
        screenId: screen.id,
        notes,
        by: input.by,
      });

      if (input.state === "rejected") {
        // The note is the person's design decision; it is copied through verbatim.
        const type: RequestType = input.followUp ?? "regenerate";
        const request = createRequest(type, screen.id, { notes, slug: screen.slug, title: screen.title });
        context.state.requests.push(request);
        requestId = request.id;
        context.emit("request_created", { requestId: request.id, type, screenId: screen.id });
      }

      const gate = computeGate(context.state);
      if (gate.canPass) context.emit("gate_ready", {});
      return undefined;
    }, input.ifRev);

    const gate = computeGate(result.state);
    return requestId === undefined ? { rev: result.state.rev, gate } : { rev: result.state.rev, gate, requestId };
  }

  async moveScreen(screenId: string, x: number, y: number): Promise<{ rev: number }> {
    const result = await this.store.mutate((context) => {
      const screen = context.state.screens.find((candidate) => candidate.id === screenId);
      if (!screen) throw new StudioError("E_SCREEN_NOT_FOUND", `no screen ${screenId}`);
      screen.canvas = { x, y };
      context.emit("canvas_moved", { screenId, x, y });
      return undefined;
    });
    return { rev: result.state.rev };
  }

  /* ----------------------------------------------------------- requests */

  async createRequest(
    type: RequestType,
    screenId?: string,
    payload: Record<string, unknown> = {},
  ): Promise<{ request: StudioRequest; rev: number }> {
    const request = createRequest(type, screenId, payload);
    const result = await this.store.mutate((context) => {
      context.state.requests.push(request);
      context.emit("request_created", { requestId: request.id, type, screenId });
      return undefined;
    });
    return { request, rev: result.state.rev };
  }

  async claimRequest(requestId: string, claimedBy: string): Promise<StudioRequest> {
    const result = await this.store.mutate((context) => {
      const request = context.state.requests.find((candidate) => candidate.id === requestId);
      if (!request) throw new StudioError("E_REQUEST_NOT_FOUND", `no request ${requestId}`);
      if (request.state !== "pending") {
        throw new StudioError("E_REQUEST_NOT_FOUND", `request ${requestId} is ${request.state}, not pending`);
      }
      request.state = "claimed";
      request.claimedBy = claimedBy;
      context.emit("request_claimed", { requestId, claimedBy });
      return structuredClone(request);
    });
    return result.value;
  }

  async resolveRequest(
    requestId: string,
    state: "done" | "failed" | "cancelled",
    payload?: Record<string, unknown>,
  ): Promise<StudioRequest> {
    const result = await this.store.mutate((context) => {
      const request = context.state.requests.find((candidate) => candidate.id === requestId);
      if (!request) throw new StudioError("E_REQUEST_NOT_FOUND", `no request ${requestId}`);
      request.state = state;
      request.resolvedAt = new Date().toISOString();
      if (payload !== undefined) request.result = payload;
      context.emit("request_resolved", { requestId, state });
      return structuredClone(request);
    });
    return result.value;
  }

  /* -------------------------------------------------------------- gates */

  async recordGate(passed: boolean, handoffSha256?: string): Promise<Gate> {
    const result = await this.store.mutate((context) => {
      context.state.gates.screens = passed
        ? { passed: true, at: new Date().toISOString(), ...(handoffSha256 ? { handoffSha256 } : {}) }
        : { passed: false };
      if (passed) {
        context.state.status = "approved";
        context.emit("gate_passed", {});
        context.emit("handoff_written", handoffSha256 ? { sha256: handoffSha256 } : {});
      }
      return undefined;
    });
    return computeGate(result.state);
  }

  /* ------------------------------------------------------------ helpers */

  eventsSince(cursor: number): { events: StudioEvent[]; cursor: number; truncated: boolean } {
    return this.store.eventsSince(cursor);
  }

  private async writeRevision(slug: string, revision: number, html: Buffer, png: Buffer): Promise<void> {
    const directory = revisionDir(this.projectRoot, slug, revision);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "code.html"), html);
    await writeFile(join(directory, "screen.png"), png);
  }

  private async loadHtml(input: FilePayload): Promise<Buffer | null> {
    const bytes = await this.loadPayload(input.htmlPath, input.htmlBase64, MAX_HTML_BYTES, "HTML");
    if (!bytes) return null;
    const text = bytes.toString("utf8");
    if (!/<[a-z!/]/i.test(text)) {
      throw new StudioError("E_INVALID_FILE", "the HTML payload contains no markup");
    }
    return bytes;
  }

  private async loadPng(input: FilePayload): Promise<Buffer | null> {
    const bytes = await this.loadPayload(input.pngPath, input.pngBase64, MAX_PNG_BYTES, "PNG");
    if (!bytes) return null;
    if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new StudioError("E_INVALID_FILE", "the PNG payload does not start with a PNG signature");
    }
    return bytes;
  }

  private async loadPayload(
    path: string | undefined,
    base64: string | undefined,
    limit: number,
    label: string,
  ): Promise<Buffer | null> {
    if (path === undefined && base64 === undefined) return null;
    if (path !== undefined && base64 !== undefined) {
      throw new StudioError("E_INVALID_FILE", `give either a path or base64 for the ${label}, not both`);
    }
    let bytes: Buffer;
    if (path !== undefined) {
      const absolute = isAbsolute(path) ? path : resolve(this.projectRoot, path);
      if (!existsSync(absolute)) {
        throw new StudioError("E_INVALID_FILE", `${label} file not found: ${path}`);
      }
      bytes = await readFile(absolute);
    } else {
      bytes = Buffer.from(base64 ?? "", "base64");
    }
    if (bytes.length === 0) throw new StudioError("E_INVALID_FILE", `the ${label} payload is empty`);
    if (bytes.length > limit) {
      throw new StudioError("E_INVALID_FILE", `the ${label} payload exceeds ${limit} bytes`, {
        bytes: bytes.length,
        limit,
      });
    }
    return bytes;
  }
}

function createRequest(
  type: RequestType,
  screenId: string | undefined,
  payload: Record<string, unknown>,
): StudioRequest {
  const request: StudioRequest = {
    id: newId("request"),
    type,
    payload,
    state: "pending",
    createdAt: new Date().toISOString(),
  };
  if (screenId !== undefined) request.screenId = screenId;
  return request;
}

/** Desktop screens sit in a row at y=0; narrower devices go in a row beneath them. */
function defaultCanvas(screens: Screen[], device: Device): { x: number; y: number } {
  const gutter = 80;
  const row = device === "desktop" ? 0 : 1;
  const peers = screens.filter((screen) => (screen.device === "desktop" ? 0 : 1) === row);
  const x = peers.reduce((total, screen) => total + screen.width + gutter, 0);
  return { x, y: row === 0 ? 0 : 1200 };
}
