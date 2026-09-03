import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

import {
  EVENT_RING_SIZE,
  SCHEMA_VERSION,
  StudioError,
  designStateSchema,
  type DesignState,
  type Gate,
  type Screen,
  type StudioEvent,
  type StudioRequest,
} from "../shared/schema.ts";
import { designJsonPath } from "../shared/paths.ts";

export interface MutationContext {
  state: DesignState;
  emit(type: string, data?: Record<string, unknown>): void;
}

type Mutator<T> = (context: MutationContext) => T | Promise<T>;

export interface MutateResult<T> {
  value: T;
  state: DesignState;
  events: StudioEvent[];
}

/**
 * The single writer of `design/design.json`.
 *
 * All writes funnel through `mutate`, which serializes them in a promise chain,
 * bumps `rev`, appends events, and replaces the file atomically with a
 * temp-file rename. Callers that read state first pass `ifRev` so a concurrent
 * write is reported as `E_REV_CONFLICT` rather than silently clobbered.
 */
export class DesignStore {
  readonly projectRoot: string;
  readonly file: string;
  private state: DesignState;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(events: StudioEvent[], state: DesignState) => void>();

  private constructor(projectRoot: string, state: DesignState) {
    this.projectRoot = projectRoot;
    this.file = designJsonPath(projectRoot);
    this.state = state;
  }

  static async open(projectRoot: string): Promise<DesignStore> {
    const file = designJsonPath(projectRoot);
    if (!existsSync(file)) {
      throw new StudioError("E_NO_STUDIO", `no design.json at ${file}; run "ls-design-studio init" first`);
    }
    const raw = await readFile(file, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new StudioError("E_NO_STUDIO", `design.json is not valid JSON: ${String(error)}`);
    }
    const result = designStateSchema.safeParse(parsed);
    if (!result.success) {
      throw new StudioError("E_NO_STUDIO", "design.json does not match schema v1", {
        issues: result.error.issues.slice(0, 8),
      });
    }
    return new DesignStore(projectRoot, result.data);
  }

  static async create(projectRoot: string, state: DesignState): Promise<DesignStore> {
    const store = new DesignStore(projectRoot, designStateSchema.parse(state));
    await store.persist();
    return store;
  }

  /** A structured clone, so a caller can never mutate live state by accident. */
  snapshot(): DesignState {
    return structuredClone(this.state);
  }

  get rev(): number {
    return this.state.rev;
  }

  get seq(): number {
    return this.state.seq;
  }

  subscribe(listener: (events: StudioEvent[], state: DesignState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async mutate<T>(mutator: Mutator<T>, ifRev?: number): Promise<MutateResult<T>> {
    const run = this.queue.then(() => this.apply(mutator, ifRev));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async apply<T>(mutator: Mutator<T>, ifRev?: number): Promise<MutateResult<T>> {
    if (ifRev !== undefined && ifRev !== this.state.rev) {
      throw new StudioError("E_REV_CONFLICT", "state changed since you last read it", {
        currentRev: this.state.rev,
        yourRev: ifRev,
      });
    }
    const draft = structuredClone(this.state);
    const emitted: Array<{ type: string; data: Record<string, unknown> }> = [];
    const value = await mutator({
      state: draft,
      emit(type, data = {}) {
        emitted.push({ type, data });
      },
    });

    draft.rev = this.state.rev + 1;
    const events: StudioEvent[] = [];
    const at = new Date().toISOString();
    for (const entry of emitted) {
      draft.seq += 1;
      const event: StudioEvent = { seq: draft.seq, at, type: entry.type, data: entry.data };
      events.push(event);
      draft.events.push(event);
    }
    if (draft.events.length > EVENT_RING_SIZE) {
      draft.events = draft.events.slice(draft.events.length - EVENT_RING_SIZE);
    }

    const validated = designStateSchema.parse(draft);
    this.state = validated;
    await this.persist();
    for (const listener of this.listeners) {
      try {
        listener(events, validated);
      } catch {
        /* a failing listener must not break the write */
      }
    }
    return { value, state: structuredClone(validated), events };
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const temp = `${this.file}.${randomBytes(4).toString("hex")}.tmp`;
    await writeFile(temp, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
    await rename(temp, this.file);
  }

  /**
   * Events strictly after `cursor`. A cursor older than the ring window cannot
   * be served as a delta, so `truncated` tells the caller to re-read full state.
   */
  eventsSince(cursor: number): { events: StudioEvent[]; cursor: number; truncated: boolean } {
    const events = this.state.events.filter((event) => event.seq > cursor);
    const oldest = this.state.events[0]?.seq ?? 0;
    const truncated = cursor > 0 && this.state.events.length > 0 && cursor < oldest - 1;
    return { events, cursor: this.state.seq, truncated };
  }

  screen(id: string): Screen {
    const found = this.state.screens.find((screen) => screen.id === id);
    if (!found) throw new StudioError("E_SCREEN_NOT_FOUND", `no screen ${id}`);
    return structuredClone(found);
  }

  request(id: string): StudioRequest {
    const found = this.state.requests.find((request) => request.id === id);
    if (!found) throw new StudioError("E_REQUEST_NOT_FOUND", `no request ${id}`);
    return structuredClone(found);
  }

  gate(): Gate {
    return computeGate(this.state);
  }
}

/**
 * The gate can pass only when there is something to approve, everything is
 * approved, nothing is stale against the current tokens, and no reapplication
 * is still queued. `passed` is the recorded outcome; `canPass` is the live check.
 */
export function computeGate(state: DesignState): Gate {
  const pending = state.screens.filter((s) => s.decision.state === "pending").map((s) => s.id);
  const rejected = state.screens.filter((s) => s.decision.state === "rejected").map((s) => s.id);
  const stale = state.screens.filter((s) => s.staleTokens).map((s) => s.id);
  const pendingReapply = state.requests.filter(
    (r) => r.type === "reapply_design_system" && (r.state === "pending" || r.state === "claimed"),
  ).length;
  const canPass =
    state.screens.length > 0 &&
    pending.length === 0 &&
    rejected.length === 0 &&
    stale.length === 0 &&
    pendingReapply === 0;
  const gate: Gate = {
    passed: state.gates.screens.passed,
    canPass,
    pending,
    rejected,
    stale,
    pendingReapply,
  };
  if (state.gates.screens.at !== undefined) gate.at = state.gates.screens.at;
  if (state.gates.screens.handoffSha256 !== undefined) {
    gate.handoffSha256 = state.gates.screens.handoffSha256;
  }
  return gate;
}

export function emptyState(input: {
  name: string;
  slug: string;
  lang?: string;
  dir?: "ltr" | "rtl";
  contrastPairs?: DesignState["contrastPairs"];
}): DesignState {
  return designStateSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    rev: 1,
    seq: 0,
    project: {
      name: input.name,
      slug: input.slug,
      root: "design",
      lang: input.lang ?? "en",
      dir: input.dir ?? "ltr",
      createdAt: new Date().toISOString(),
    },
    status: "draft",
    tokensHash: "",
    contrastPairs: input.contrastPairs ?? DEFAULT_CONTRAST_PAIRS,
    generator: { kind: "agent" },
    screens: [],
    requests: [],
    events: [],
    gates: { screens: { passed: false } },
    approvals: [],
    provenance: {},
  });
}

export const DEFAULT_CONTRAST_PAIRS: DesignState["contrastPairs"] = [
  { foreground: "content", background: "background", target: 4.5 },
  { foreground: "content-muted", background: "background", target: 4.5 },
  { foreground: "content", background: "surface", target: 4.5 },
  { foreground: "on-primary", background: "primary", target: 4.5 },
  { foreground: "on-accent", background: "accent", target: 4.5 },
  { foreground: "border-strong", background: "surface", target: 3 },
  { foreground: "focus", background: "background", target: 3 },
];

export function joinDesign(projectRoot: string, relative: string): string {
  return join(projectRoot, "design", relative);
}
