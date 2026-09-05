import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initProject } from "../server/init.ts";
import { DesignStore } from "../server/store.ts";
import { StudioService } from "../server/service.ts";
import { designJsonPath, designMdPath } from "../shared/paths.ts";

/*
  A design authored elsewhere arrives as a DESIGN.md with nothing beside it.
  The studio has to be able to open that: the contract is the portable artifact,
  and the sidecar is derived from it, not the other way round.
*/

const CONTRACT = `---
name: "Adopted Project"
description: "A contract written somewhere else."
version: "1.0"
colors:
  background: "#101210"
  surface: "#181A18"
  content: "#EDEDE7"
  content-muted: "#A0A29A"
  border: "#2A2D2A"
  border-strong: "#6E7269"
  primary: "#EDEDE7"
  on-primary: "#101210"
  accent: "#D2A468"
  on-accent: "#1A1509"
typography:
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  md: "0.375rem"
spacing:
  md: "1rem"
---

# Adopted Project

## Overview

Written by someone else, adopted here.
`;

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ls-adopt-"));
  await mkdir(join(root, "design"), { recursive: true });
  await writeFile(designMdPath(root), CONTRACT, "utf8");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("adopting a contract written elsewhere", () => {
  it("builds the sidecar and the derived files from a lone DESIGN.md", async () => {
    const result = await initProject({ projectRoot: root });

    expect(result.existing).toContain("DESIGN.md");
    expect(result.created).toEqual(
      expect.arrayContaining(["design.json", "tokens.css", "tailwind.theme.css", "preview.html"]),
    );

    const store = await DesignStore.open(root);
    const state = store.snapshot();
    expect(state.screens).toEqual([]);
    expect(state.tokensHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("takes its identity from the contract rather than a default", async () => {
    await initProject({ projectRoot: root });
    const state = (await DesignStore.open(root)).snapshot();
    expect(state.project.name).toBe("Adopted Project");
    expect(state.project.slug).toBe("adopted-project");
  });

  it("never rewrites the contract it adopted", async () => {
    const before = await readFile(designMdPath(root), "utf8");
    await initProject({ projectRoot: root });
    expect(await readFile(designMdPath(root), "utf8")).toBe(before);
  });

  it("derives the same tokens the contract declares", async () => {
    await initProject({ projectRoot: root });
    const service = new StudioService(await DesignStore.open(root));
    const { frontmatter } = await service.tokenModel();
    const colors = frontmatter.colors as Record<string, string>;
    expect(colors["accent"]).toBe("#D2A468");

    const css = await readFile(join(root, "design", "tokens.css"), "utf8");
    expect(css).toContain("--ls-color-accent: #D2A468;");
  });

  it("is deterministic: adopting the same contract twice gives the same hash", async () => {
    await initProject({ projectRoot: root });
    const first = (await DesignStore.open(root)).snapshot().tokensHash;

    const second = await mkdtemp(join(tmpdir(), "ls-adopt-2-"));
    await mkdir(join(second, "design"), { recursive: true });
    await writeFile(designMdPath(second), CONTRACT, "utf8");
    await initProject({ projectRoot: second });
    const other = (await DesignStore.open(second)).snapshot().tokensHash;
    await rm(second, { recursive: true, force: true });

    expect(other).toBe(first);
  });

  it("is idempotent: adopting twice keeps the sidecar it already made", async () => {
    await initProject({ projectRoot: root });
    const before = await readFile(designJsonPath(root), "utf8");
    const again = await initProject({ projectRoot: root });
    expect(again.existing).toEqual(expect.arrayContaining(["DESIGN.md", "design.json"]));
    const after = JSON.parse(await readFile(designJsonPath(root), "utf8")) as { rev: number };
    // The rev advances because provenance is re-stamped, but nothing is lost.
    expect(after.rev).toBeGreaterThanOrEqual(JSON.parse(before).rev);
  });

  it("still honours an explicit name over the contract's own", async () => {
    await initProject({ projectRoot: root, name: "Renamed" });
    expect((await DesignStore.open(root)).snapshot().project.name).toBe("Renamed");
  });
});
