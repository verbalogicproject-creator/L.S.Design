import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DesignStore, emptyState } from "../server/store.ts";
import { exportHandoff } from "../server/handoff/export.ts";
import { StudioError, type Screen } from "../shared/schema.ts";
import {
  designMdPath,
  handoffDir,
  revisionDir,
  revisionRelative,
  tailwindThemePath,
  tokensCssPath,
} from "../shared/paths.ts";

const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d494844520000000100000001080600000" +
    "01f15c4890000000a49444154789c6360000002000155e51a2b0000000049454e44ae426082",
  "hex",
);

const DESIGN_MD = `---
name: "Orbit One"
description: "A fallback description."
colors:
  content: "#111111"
  background: "#ffffff"
---

## Overview

**Premise.** Orbit One helps small teams launch a marketing site fast.

## Screens

Nothing else matters for this test.
`;

function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

async function addScreen(
  store: DesignStore,
  input: { slug: string; title: string; decision: "pending" | "approved" | "rejected" },
): Promise<void> {
  const root = store.projectRoot;
  const revision = 1;
  const dir = revisionDir(root, input.slug, revision);
  await mkdir(dir, { recursive: true });
  const htmlContent = `<!doctype html><html><body><h1>${input.title}</h1><p>Only $19/mo. Rated 4.8/5 by 1,200+ customers.</p></body></html>`;
  await writeFile(join(dir, "code.html"), htmlContent, "utf8");
  await writeFile(join(dir, "screen.png"), TINY_PNG);

  const id = `scr_${randomBytes(4).toString("hex")}`;
  const screen: Screen = {
    id,
    slug: input.slug,
    title: input.title,
    device: "desktop",
    width: 1440,
    height: 1024,
    source: { kind: "agent" },
    revision,
    files: {
      html: revisionRelative(input.slug, revision, "code.html"),
      png: revisionRelative(input.slug, revision, "screen.png"),
      sha256: { html: sha256(htmlContent), png: sha256(TINY_PNG) },
    },
    decision: { state: input.decision, notes: "" },
    tokenDriven: false,
  staleTokens: false,
    canvas: { x: 0, y: 0 },
  };

  await store.mutate(({ state }) => {
    state.screens.push(screen);
  });
}

describe("exportHandoff", () => {
  let root: string;
  let store: DesignStore;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ls-design-handoff-"));
    store = await DesignStore.create(root, emptyState({ name: "Orbit One", slug: "orbit-one" }));
    await mkdir(join(root, "design"), { recursive: true });
    await writeFile(designMdPath(root), DESIGN_MD, "utf8");
    await writeFile(tokensCssPath(root), ":root { --ls-color-content: #111111; }\n", "utf8");
    await writeFile(tailwindThemePath(root), '@import "tailwindcss";\n', "utf8");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("is blocked while a screen is pending", async () => {
    await addScreen(store, { slug: "home", title: "Home", decision: "approved" });
    await addScreen(store, { slug: "about", title: "About", decision: "pending" });

    await expect(exportHandoff(store)).rejects.toMatchObject({
      code: "E_GATE_BLOCKED",
    });
    try {
      await exportHandoff(store);
      throw new Error("expected exportHandoff to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(StudioError);
    }
  });

  it("passes once every screen is approved and writes the full handoff shape", async () => {
    await addScreen(store, { slug: "home", title: "Home", decision: "approved" });
    await addScreen(store, { slug: "about", title: "About", decision: "pending" });

    await store.mutate(({ state }) => {
      const about = state.screens.find((screen) => screen.slug === "about");
      if (about) about.decision.state = "approved";
    });

    const result = await exportHandoff(store);
    expect(result.gatePassed).toBe(true);
    expect(result.screens).toBe(2);

    const dir = handoffDir(root);
    expect(result.path).toBe(dir);

    for (const relative of [
      "BRIEF.md",
      "DESIGN.md",
      "tokens.css",
      "tailwind.theme.css",
      "design.json",
      "screens.json",
      "target_stack.json",
      "handoff.sha256",
      "screens/home/code.html",
      "screens/home/screen.png",
      "screens/about/code.html",
      "screens/about/screen.png",
      "fixtures/home.json",
      "fixtures/about.json",
    ]) {
      expect(existsSync(join(dir, relative)), `expected ${relative} to exist`).toBe(true);
    }

    const digestText = await readFile(join(dir, "handoff.sha256"), "utf8");
    const lines = digestText.trim().split("\n");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const [hex, relative] = line.split("  ");
      expect(hex).toBeDefined();
      expect(relative).toBeDefined();
      const content = await readFile(join(dir, relative as string));
      expect(sha256(content)).toBe(hex);
    }

    const expectedSha = sha256(digestText);
    expect(result.sha256).toBe(expectedSha);

    const brief = await readFile(join(dir, "BRIEF.md"), "utf8");
    expect(brief).toContain("Orbit One helps small teams launch a marketing site fast.");
    expect(brief).not.toContain("TODO");
    expect(brief).not.toContain("TBD");
    expect(brief).not.toContain("PLACEHOLDER");

    const fixturesHome = JSON.parse(await readFile(join(dir, "fixtures/home.json"), "utf8"));
    expect(Array.isArray(fixturesHome)).toBe(true);
    expect(fixturesHome.length).toBeGreaterThan(0);
  });

  it("writes the handoff with force: true even when the gate is blocked", async () => {
    await addScreen(store, { slug: "home", title: "Home", decision: "pending" });

    const result = await exportHandoff(store, { force: true });
    expect(result.gatePassed).toBe(false);

    const dir = handoffDir(root);
    const brief = await readFile(join(dir, "BRIEF.md"), "utf8");
    const firstLine = brief.split("\n")[0];
    expect(firstLine).toBe(
      "> GATE NOT PASSED — this handoff is provisional and must not be treated as approved.",
    );
  });
});
