import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DesignStore, computeGate, emptyState } from "../server/store.ts";
import { StudioError, type DesignState } from "../shared/schema.ts";
import { designJsonPath } from "../shared/paths.ts";

let root = "";

async function makeStore(): Promise<DesignStore> {
  return DesignStore.create(root, emptyState({ name: "Orbit One", slug: "orbit-one" }));
}

function screen(id: string, overrides: Partial<DesignState["screens"][number]> = {}) {
  return {
    id,
    slug: id.replace("scr_", "s-"),
    title: "Home",
    device: "desktop" as const,
    width: 1440,
    height: 1024,
    source: { kind: "agent" as const },
    revision: 1,
    files: {
      html: `screens/${id}/r1/code.html`,
      png: `screens/${id}/r1/screen.png`,
      sha256: { html: "a".repeat(64), png: "b".repeat(64) },
    },
    decision: { state: "pending" as const, notes: "" },
    tokenDriven: false,
  staleTokens: false,
    canvas: { x: 0, y: 0 },
    ...overrides,
  };
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ls-store-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("DesignStore", () => {
  it("writes design.json atomically and reopens it", async () => {
    const store = await makeStore();
    const reopened = await DesignStore.open(root);
    expect(reopened.snapshot().project.name).toBe("Orbit One");
    const raw = await readFile(designJsonPath(root), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(store.rev).toBe(1);
  });

  it("refuses to open a folder with no design.json", async () => {
    const empty = await mkdtemp(join(tmpdir(), "ls-empty-"));
    await expect(DesignStore.open(empty)).rejects.toThrowError(/no design.json/);
    await rm(empty, { recursive: true, force: true });
  });

  it("bumps rev and appends events on every mutation", async () => {
    const store = await makeStore();
    const before = store.rev;
    const result = await store.mutate((context) => {
      context.state.status = "screens";
      context.emit("screen_added", { screenId: "scr_00000001" });
      return "done";
    });
    expect(result.value).toBe("done");
    expect(store.rev).toBe(before + 1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe("screen_added");
    expect(store.seq).toBe(1);
  });

  it("reports E_REV_CONFLICT when someone wrote first", async () => {
    const store = await makeStore();
    const stale = store.rev;
    await store.mutate((context) => {
      context.state.status = "direction";
      return undefined;
    });
    let caught: unknown;
    try {
      await store.mutate((context) => {
        context.state.status = "screens";
        return undefined;
      }, stale);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(StudioError);
    expect((caught as StudioError).code).toBe("E_REV_CONFLICT");
    expect((caught as StudioError).detail?.["currentRev"]).toBe(store.rev);
  });

  it("serializes concurrent writes so exactly one ifRev holder wins", async () => {
    const store = await makeStore();
    const base = store.rev;
    const results = await Promise.allSettled([
      store.mutate((context) => {
        context.state.status = "direction";
        return "a";
      }, base),
      store.mutate((context) => {
        context.state.status = "screens";
        return "b";
      }, base),
    ]);
    const fulfilled = results.filter((entry) => entry.status === "fulfilled");
    const rejected = results.filter((entry) => entry.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(((rejected[0] as PromiseRejectedResult).reason as StudioError).code).toBe("E_REV_CONFLICT");
  });

  it("does not apply a mutation that threw", async () => {
    const store = await makeStore();
    const before = store.snapshot();
    await expect(
      store.mutate(() => {
        throw new Error("boom");
      }),
    ).rejects.toThrowError("boom");
    expect(store.snapshot()).toEqual(before);
  });

  it("replays the same events for the same cursor", async () => {
    const store = await makeStore();
    await store.mutate((context) => {
      context.emit("one");
      context.emit("two");
      return undefined;
    });
    const first = store.eventsSince(0);
    const second = store.eventsSince(0);
    expect(first.events.map((event) => event.type)).toEqual(["one", "two"]);
    expect(second).toEqual(first);
    expect(store.eventsSince(first.cursor).events).toHaveLength(0);
    expect(first.truncated).toBe(false);
  });

  it("caps the event ring at 500 entries", async () => {
    const store = await makeStore();
    await store.mutate((context) => {
      for (let index = 0; index < 600; index += 1) context.emit("tick", { index });
      return undefined;
    });
    expect(store.snapshot().events).toHaveLength(500);
    expect(store.seq).toBe(600);
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    const store = await makeStore();
    const seen: string[] = [];
    const unsubscribe = store.subscribe((events) => {
      for (const event of events) seen.push(event.type);
    });
    await store.mutate((context) => {
      context.emit("first");
      return undefined;
    });
    unsubscribe();
    await store.mutate((context) => {
      context.emit("second");
      return undefined;
    });
    expect(seen).toEqual(["first"]);
  });

  it("hands out copies, never live state", async () => {
    const store = await makeStore();
    const snapshot = store.snapshot();
    snapshot.status = "built";
    expect(store.snapshot().status).toBe("draft");
  });
});

describe("computeGate", () => {
  it("cannot pass with no screens", async () => {
    const store = await makeStore();
    expect(computeGate(store.snapshot()).canPass).toBe(false);
  });

  it("names exactly what blocks it", async () => {
    const store = await makeStore();
    await store.mutate((context) => {
      context.state.screens.push(
        screen("scr_00000001", { decision: { state: "approved", notes: "" } }),
        screen("scr_00000002"),
        screen("scr_00000003", { decision: { state: "rejected", notes: "too generic" } }),
        screen("scr_00000004", { decision: { state: "approved", notes: "" }, staleTokens: true }),
      );
      return undefined;
    });
    const gate = computeGate(store.snapshot());
    expect(gate.canPass).toBe(false);
    expect(gate.pending).toEqual(["scr_00000002"]);
    expect(gate.rejected).toEqual(["scr_00000003"]);
    expect(gate.stale).toEqual(["scr_00000004"]);
  });

  it("passes once everything is approved, fresh, and nothing is queued", async () => {
    const store = await makeStore();
    await store.mutate((context) => {
      context.state.screens.push(screen("scr_00000001", { decision: { state: "approved", notes: "" } }));
      return undefined;
    });
    expect(computeGate(store.snapshot()).canPass).toBe(true);
  });

  it("stays blocked while a reapplication is still queued", async () => {
    const store = await makeStore();
    await store.mutate((context) => {
      context.state.screens.push(screen("scr_00000001", { decision: { state: "approved", notes: "" } }));
      context.state.requests.push({
        id: "req_00000001",
        type: "reapply_design_system",
        payload: {},
        state: "pending",
        createdAt: new Date().toISOString(),
      });
      return undefined;
    });
    const gate = computeGate(store.snapshot());
    expect(gate.pendingReapply).toBe(1);
    expect(gate.canPass).toBe(false);
  });
});

describe("the shipped orbit-one fixture", () => {
  it("parses as schema v1 and its gate is ready", async () => {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const { designStateSchema } = await import("../shared/schema.ts");

    const here = dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(resolve(here, "..", "fixtures", "orbit-one", "design.json"), "utf8");
    const parsed = designStateSchema.parse(JSON.parse(raw));

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.screens).toHaveLength(2);
    expect(parsed.screens.every((entry) => entry.decision.state === "approved")).toBe(true);
    expect(computeGate(parsed).canPass).toBe(true);
  });
});
