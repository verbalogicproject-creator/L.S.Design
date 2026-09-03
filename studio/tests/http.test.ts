import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../server/http.ts";
import { DesignStore } from "../server/store.ts";
import { StudioService } from "../server/service.ts";
import { initProject } from "../server/init.ts";
import type { Env } from "../server/routes/context.ts";
import type { DesignState, Gate, Screen, StudioRequest } from "../shared/schema.ts";
import { designDir } from "../shared/paths.ts";

vi.mock("../server/online.ts", () => ({
  isOnline: async () => false,
  resetOnlineCache: () => undefined,
}));

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000100ffff0300000600" +
    "0557bfabd40000000049454e44ae426082",
  "hex",
);
const HTML = "<!doctype html><html><body><h1>Home</h1><p>$249</p></body></html>";

let root = "";
let app: Hono<Env>;
let service: StudioService;

async function addScreen(title = "Home", device: "desktop" | "mobile" = "desktop") {
  const response = await app.request("/api/screens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      device,
      width: device === "desktop" ? 1440 : 390,
      height: 1024,
      source: { kind: "agent" },
      htmlBase64: Buffer.from(HTML).toString("base64"),
      pngBase64: PNG.toString("base64"),
    }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { screenId: string; slug: string; revision: number; rev: number };
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ls-http-"));
  await initProject({ projectRoot: root, name: "Orbit One" });
  const store = await DesignStore.open(root);
  service = new StudioService(store);
  app = createApp(service);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("state and status", () => {
  it("serves the full document and a status summary", async () => {
    const state = (await (await app.request("/api/state")).json()) as DesignState;
    expect(state.schemaVersion).toBe(1);
    expect(state.project.name).toBe("Orbit One");

    const status = (await (await app.request("/api/status")).json()) as {
      rev: number;
      online: boolean;
      screens: Screen[];
      gate: Gate;
    };
    expect(status.online).toBe(false);
    expect(status.screens).toEqual([]);
    expect(status.gate.canPass).toBe(false);
  });

  it("answers a health probe", async () => {
    const body = (await (await app.request("/healthz")).json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe("screens", () => {
  it("stores a screen with both files and puts it in pending review", async () => {
    const added = await addScreen();
    expect(added.slug).toBe("home");
    expect(added.revision).toBe(1);

    const screen = service.state().screens[0];
    expect(screen?.decision.state).toBe("pending");
    expect(await readFile(join(designDir(root), screen?.files.html ?? ""), "utf8")).toBe(HTML);
  });

  it("refuses a payload that is not a PNG", async () => {
    const response = await app.request("/api/screens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Broken",
        device: "desktop",
        width: 1440,
        height: 1024,
        source: { kind: "agent" },
        htmlBase64: Buffer.from(HTML).toString("base64"),
        pngBase64: Buffer.from("not a png").toString("base64"),
      }),
    });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_INVALID_FILE");
  });

  it("creates a new revision and returns the screen to pending", async () => {
    const added = await addScreen();
    await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "approved" }),
    });

    const response = await app.request(`/api/screens/${added.screenId}/revision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ htmlBase64: Buffer.from(`${HTML}<!-- r2 -->`).toString("base64") }),
    });
    const body = (await response.json()) as { revision: number };
    expect(body.revision).toBe(2);
    expect(service.state().screens[0]?.decision.state).toBe("pending");
    expect(service.state().screens[0]?.files.html).toContain("/r2/");
  });

  it("reports a missing screen", async () => {
    const response = await app.request("/api/screens/scr_deadbeef/decision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "approved" }),
    });
    expect(response.status).toBe(404);
  });

  it("persists a canvas move", async () => {
    const added = await addScreen();
    await app.request(`/api/screens/${added.screenId}/canvas`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ x: 120, y: -40 }),
    });
    expect(service.state().screens[0]?.canvas).toEqual({ x: 120, y: -40 });
  });
});

describe("decisions", () => {
  it("records an approval as a human decision and opens the gate", async () => {
    const added = await addScreen();
    const response = await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "approved" }),
    });
    const body = (await response.json()) as { gate: Gate };
    expect(body.gate.canPass).toBe(true);

    const state = service.state();
    expect(state.screens[0]?.decision.by).toBe("human");
    expect(state.approvals).toHaveLength(1);
  });

  it("copies a rejection note verbatim into a queued request", async () => {
    const added = await addScreen();
    const notes = "The hero reads as a generic template. Use the product silhouette.";
    const response = await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "rejected", notes, followUp: "edit_with_prompt" }),
    });
    const body = (await response.json()) as { requestId?: string; gate: Gate };
    expect(body.requestId).toBeDefined();
    expect(body.gate.canPass).toBe(false);

    const request = service.state().requests.find((entry) => entry.id === body.requestId);
    expect(request?.type).toBe("edit_with_prompt");
    expect(request?.payload["notes"]).toBe(notes);
  });

  it("rejects a stale ifRev with a conflict", async () => {
    const added = await addScreen();
    const staleRev = added.rev - 1;
    const response = await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "approved", ifRev: staleRev }),
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { code: string; detail?: { currentRev?: number } } };
    expect(body.error.code).toBe("E_REV_CONFLICT");
    expect(body.error.detail?.currentRev).toBe(service.state().rev);
  });
});

describe("requests", () => {
  it("moves a request through claim and resolve", async () => {
    const created = (await (
      await app.request("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "add_screen", payload: { title: "Specs" } }),
      })
    ).json()) as { request: StudioRequest };

    const claimed = (await (
      await app.request(`/api/requests/${created.request.id}/claim`, { method: "POST" })
    ).json()) as { request: StudioRequest };
    expect(claimed.request.state).toBe("claimed");

    const resolved = (await (
      await app.request(`/api/requests/${created.request.id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: "done", result: { screenId: "scr_00000001" } }),
      })
    ).json()) as { request: StudioRequest };
    expect(resolved.request.state).toBe("done");
    expect(resolved.request.resolvedAt).toBeDefined();
  });

  it("refuses to claim a request twice", async () => {
    const created = (await (
      await app.request("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "variants" }),
      })
    ).json()) as { request: StudioRequest };
    await app.request(`/api/requests/${created.request.id}/claim`, { method: "POST" });
    const second = await app.request(`/api/requests/${created.request.id}/claim`, { method: "POST" });
    expect(second.status).toBe(404);
  });
});

describe("tokens", () => {
  it("returns the token maps and computed contrast for both themes", async () => {
    const body = (await (await app.request("/api/tokens")).json()) as {
      tokens: { colors: Record<string, string> };
      contrast: Array<{ theme: string; passes: boolean; ratio: number }>;
    };
    expect(body.tokens.colors["primary"]).toBeDefined();
    expect(body.contrast.some((row) => row.theme === "light")).toBe(true);
    expect(body.contrast.some((row) => row.theme === "dark")).toBe(true);
    expect(body.contrast.every((row) => row.ratio >= 1)).toBe(true);
  });

  it("clears staleness when a token is edited back to its captured value", async () => {
    await addScreen();
    const before = (await (await app.request("/api/tokens")).json()) as {
      tokens: Record<string, unknown>;
      tokensHash: string;
    };
    const original = { ...(before.tokens["colors"] as Record<string, string>) };

    // Edit away: the screen was captured under the old tokens, so it is stale.
    await app.request("/api/tokens", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tokens: { ...before.tokens, colors: { ...original, background: "#0000FF" } },
        queueReapply: false,
      }),
    });
    expect(service.state().screens.every((screen) => screen.staleTokens)).toBe(true);

    // Edit back: the hash returns to the captured value, so staleness lifts.
    const restored = await app.request("/api/tokens", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens: { ...before.tokens, colors: original }, queueReapply: false }),
    });
    const body = (await restored.json()) as { tokensHash: string };
    expect(body.tokensHash).toBe(before.tokensHash);
    expect(service.state().screens.every((screen) => screen.staleTokens)).toBe(false);
  });

  it("rewrites the frontmatter, regenerates derived files, and stales the screens", async () => {
    await addScreen();
    const before = (await (await app.request("/api/tokens")).json()) as {
      tokens: Record<string, unknown>;
      tokensHash: string;
    };
    const colors = { ...(before.tokens["colors"] as Record<string, string>), primary: "#1D4ED8" };

    const response = await app.request("/api/tokens", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens: { ...before.tokens, colors } }),
    });
    const body = (await response.json()) as { tokensHash: string; requestId?: string };
    expect(body.tokensHash).not.toBe(before.tokensHash);
    expect(body.requestId).toBeDefined();

    const state = service.state();
    expect(state.screens.every((screen) => screen.staleTokens)).toBe(true);
    expect(state.requests.some((request) => request.type === "reapply_design_system")).toBe(true);

    const css = await readFile(join(designDir(root), "tokens.css"), "utf8");
    expect(css).toContain("--ls-color-primary: #1D4ED8;");
    const preview = await readFile(join(designDir(root), "preview.html"), "utf8");
    expect(preview).toContain("--ls-color-primary: #1D4ED8;");
  });

  it("leaves the prose untouched when tokens change", async () => {
    const path = join(designDir(root), "DESIGN.md");
    const before = await readFile(path, "utf8");
    const prose = before.slice(before.indexOf("\n# "));

    const tokens = (await (await app.request("/api/tokens")).json()) as { tokens: Record<string, unknown> };
    const colors = { ...(tokens.tokens["colors"] as Record<string, string>), accent: "#B45309" };
    await app.request("/api/tokens", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens: { ...tokens.tokens, colors } }),
    });

    const after = await readFile(path, "utf8");
    expect(after.slice(after.indexOf("\n# "))).toBe(prose);
  });

  it("refuses an unparseable colour", async () => {
    const tokens = (await (await app.request("/api/tokens")).json()) as { tokens: Record<string, unknown> };
    const colors = { ...(tokens.tokens["colors"] as Record<string, string>), primary: "chartreuseish" };
    const response = await app.request("/api/tokens", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokens: { ...tokens.tokens, colors } }),
    });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("E_TOKENS_INVALID");
  });
});

describe("files", () => {
  it("serves a screen's HTML with a restrictive policy", async () => {
    const added = await addScreen();
    const screen = service.state().screens.find((entry) => entry.id === added.screenId);
    const response = await app.request(`/files/${screen?.files.html}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("serves a screen's PNG without the HTML policy", async () => {
    const added = await addScreen();
    const screen = service.state().screens.find((entry) => entry.id === added.screenId);
    const response = await app.request(`/files/${screen?.files.png}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-security-policy")).toBeNull();
  });

  it("never serves a file outside the design folder", async () => {
    await writeFile(join(root, "secret.txt"), "not for the browser", "utf8");
    // Some of these are normalised away by URL parsing before routing and fall
    // through to the app shell; the security property is that none of them ever
    // returns the file, whatever status the router settles on.
    for (const path of [
      "/files/../secret.txt",
      "/files/..%2Fsecret.txt",
      "/files/%2e%2e/secret.txt",
      "/files/a/../../secret.txt",
      "/files//etc/passwd",
    ]) {
      const response = await app.request(path);
      expect(await response.text()).not.toContain("not for the browser");
    }
  });

  it("rejects an encoded traversal segment with 403", async () => {
    const response = await app.request("/files/..%2Fsecret.txt");
    expect(response.status).toBe(403);
  });

  it("returns 404 for a file that does not exist", async () => {
    await mkdir(join(designDir(root), "screens", "ghost"), { recursive: true });
    expect((await app.request("/files/screens/ghost/r1/code.html")).status).toBe(404);
  });
});

describe("wait", () => {
  it("returns immediately when events are already past the cursor", async () => {
    await addScreen();
    const body = (await (await app.request("/api/wait?cursor=0&timeoutSec=1")).json()) as {
      events: Array<{ type: string }>;
      cursor: number;
    };
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.cursor).toBe(service.state().seq);
  });

  it("returns empty at the timeout with the cursor unchanged", async () => {
    await addScreen();
    const cursor = service.state().seq;
    const body = (await (await app.request(`/api/wait?cursor=${cursor}&timeoutSec=1`)).json()) as {
      events: unknown[];
      cursor: number;
      gate: Gate;
    };
    expect(body.events).toEqual([]);
    expect(body.cursor).toBe(cursor);
    expect(body.gate).toBeDefined();
  });
});

describe("approval authority", () => {
  it("refuses an approval attributed to the agent", async () => {
    const added = await addScreen();
    const response = await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "approved", by: "agent" }),
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("E_GATE_BLOCKED");
    expect(body.error.message).toContain("cannot approve");
    expect(service.state().screens[0]?.decision.state).toBe("pending");
    expect(service.gate().canPass).toBe(false);
  });

  it("accepts an agent rejection and attributes it to the agent", async () => {
    const added = await addScreen();
    const response = await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "rejected", by: "agent", notes: "Invents a claim the facts do not contain." }),
    });
    expect(response.status).toBe(200);
    const screen = service.state().screens[0];
    expect(screen?.decision.state).toBe("rejected");
    expect(screen?.decision.by).toBe("agent");
    expect(service.state().approvals[0]?.by).toBe("agent");
  });

  it("still attributes a browser decision to the person", async () => {
    const added = await addScreen();
    await app.request(`/api/screens/${added.screenId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "approved" }),
    });
    expect(service.state().screens[0]?.decision.by).toBe("human");
  });
});
