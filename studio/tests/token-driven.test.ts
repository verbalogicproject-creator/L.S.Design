import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignStore } from "../server/store.ts";
import { StudioService } from "../server/service.ts";
import { initProject } from "../server/init.ts";
import { lintTokenDrivenHtml } from "../shared/screen-lint.ts";
import { StudioError } from "../shared/schema.ts";

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

const CLEAN = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="../../../tokens.css"></head>
<body style="background: var(--ls-color-background); color: var(--ls-color-content)">
<h1 style="font-family: var(--ls-font-display)">Orbit One</h1></body></html>`;

let root = "";
let service: StudioService;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ls-token-driven-"));
  await initProject({ projectRoot: root, name: "Token Driven" });
  const store = await DesignStore.open(root);
  service = new StudioService(store);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function add(html: string, tokenDriven: boolean) {
  return service.addScreen({
    title: "Home",
    device: "desktop",
    width: 1440,
    height: 900,
    source: { kind: "agent" },
    tokenDriven,
    htmlBase64: Buffer.from(html).toString("base64"),
    pngBase64: PNG.toString("base64"),
  });
}

describe("token-driven screen lint", () => {
  it("passes HTML that renders only from tokens and same-origin assets", () => {
    expect(lintTokenDrivenHtml(CLEAN)).toEqual([]);
  });

  it("does not mistake a numeric character entity for a colour", () => {
    expect(lintTokenDrivenHtml("<p>room&#8209;filling &#233; &#8212;</p>")).toEqual([]);
  });

  it("catches hex literals, colour functions, and remote assets", () => {
    const dirty = `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/x">
      </head><body style="color:#ff0000;background:rgba(0,0,0,.5)"></body></html>`;
    const rules = lintTokenDrivenHtml(dirty).map((finding) => finding.rule);
    expect(rules).toContain("hex-color-literal");
    expect(rules).toContain("functional-color-literal");
    expect(rules).toContain("remote-asset");
  });

  it("refuses to store a token-driven screen that carries its own colours", async () => {
    await expect(add(`<html><body style="color:#123456"></body></html>`, true)).rejects.toThrow(
      StudioError,
    );
  });

  it("still accepts the same HTML as a baked screen", async () => {
    const { screen } = await add(`<html><body style="color:#123456"></body></html>`, false);
    expect(screen.tokenDriven).toBe(false);
  });
});

describe("token-driven screens and token edits", () => {
  it("never goes stale when a token changes, while a baked screen does", async () => {
    const { screen: driven } = await add(CLEAN, true);
    const { screen: baked } = await add("<html><body>baked</body></html>", false);

    const tokens = await service.tokenModel();
    const colors = { ...(tokens.frontmatter.colors as Record<string, string>), accent: "#123456" };
    await service.setTokens({ ...tokens.frontmatter, colors }, { queueReapply: false });

    const state = service.state();
    const after = (id: string) => state.screens.find((s) => s.id === id);
    expect(after(driven.id)?.staleTokens).toBe(false);
    expect(after(baked.id)?.staleTokens).toBe(true);
  });
});
