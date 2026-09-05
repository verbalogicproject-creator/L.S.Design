import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { DesignStore } from "../server/store.ts";
import { StudioService } from "../server/service.ts";
import { initProject } from "../server/init.ts";
import { exportHandoff } from "../server/handoff/export.ts";
import { designDir, handoffDir, tokensCssPath } from "../shared/paths.ts";
import { prefixToRoot, relinkDesignStylesheets } from "../shared/screen-links.ts";

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

/* What an author following screen-authoring.md actually writes. */
const AUTHORED = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="../tokens.css"></head>
<body style="background: var(--ls-color-background); color: var(--ls-color-content)">
<h1 style="font-family: var(--ls-font-display)">Orbit One</h1></body></html>`;

function hrefIn(html: string): string {
  const match = /<link\b[^>]*\shref\s*=\s*"([^"]*)"/i.exec(html);
  return match?.[1] ?? "";
}

describe("prefixToRoot", () => {
  it("counts the directories a screen has to climb", () => {
    expect(prefixToRoot("screens/home/r1/code.html")).toBe("../../../");
    expect(prefixToRoot("screens/home/code.html")).toBe("../../");
    expect(prefixToRoot("code.html")).toBe("");
  });
});

describe("relinkDesignStylesheets", () => {
  it("repairs the href whatever depth the author guessed", () => {
    for (const authored of ["../tokens.css", "tokens.css", "./tokens.css", "design/tokens.css"]) {
      const html = `<link rel="stylesheet" href="${authored}">`;
      expect(relinkDesignStylesheets(html, "screens/home/r1/code.html")).toBe(
        `<link rel="stylesheet" href="../../../tokens.css">`,
      );
    }
  });

  it("handles the other stylesheets that live at the design root", () => {
    const html = `<link rel="stylesheet" href="../fonts.css"><link rel="stylesheet" href="x/tailwind.theme.css">`;
    const out = relinkDesignStylesheets(html, "screens/home/code.html");
    expect(out).toContain(`href="../../fonts.css"`);
    expect(out).toContain(`href="../../tailwind.theme.css"`);
  });

  it("leaves a remote href alone so the linter still reports it", () => {
    const html = `<link rel="stylesheet" href="https://cdn.example.com/tokens.css">`;
    expect(relinkDesignStylesheets(html, "screens/home/r1/code.html")).toBe(html);
  });

  it("does not rewrite an unrelated stylesheet or a data-href", () => {
    const html = `<link rel="stylesheet" href="./local.css"><link data-href="tokens.css" rel="preload">`;
    expect(relinkDesignStylesheets(html, "screens/home/r1/code.html")).toBe(html);
  });

  it("is idempotent, so a re-store does not stack prefixes", () => {
    const once = relinkDesignStylesheets(AUTHORED, "screens/home/r1/code.html");
    expect(relinkDesignStylesheets(once, "screens/home/r1/code.html")).toBe(once);
  });
});

describe("a stored screen's stylesheet link resolves", () => {
  let root = "";
  let store: DesignStore;
  let service: StudioService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ls-screen-links-"));
    await initProject({ projectRoot: root, name: "Orbit One" });
    store = await DesignStore.open(root);
    service = new StudioService(store);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function addApproved() {
    const screen = await service.addScreen({
      title: "Home",
      device: "desktop",
      width: 1440,
      height: 900,
      source: { kind: "agent" },
      tokenDriven: true,
      htmlBase64: Buffer.from(AUTHORED).toString("base64"),
      pngBase64: PNG.toString("base64"),
    });
    await store.mutate(({ state }) => {
      for (const item of state.screens) item.decision = { state: "approved", notes: "" };
    });
    return screen;
  }

  it("points at the real tokens.css from where the studio stored it", async () => {
    await addApproved();
    const stored = join(designDir(root), "screens", "home", "r1", "code.html");
    const html = await readFile(stored, "utf8");

    const target = resolve(dirname(stored), hrefIn(html));
    expect(existsSync(target)).toBe(true);
    expect(target).toBe(resolve(tokensCssPath(root)));
  });

  it("points at the frozen copy inside a handoff, not the live one", async () => {
    await addApproved();
    await exportHandoff(store, { force: true });

    const exported = join(handoffDir(root), "screens", "home", "code.html");
    const html = await readFile(exported, "utf8");

    const target = resolve(dirname(exported), hrefIn(html));
    expect(existsSync(target)).toBe(true);
    /*
      The point of the snapshot: an approved screen must render from the tokens
      frozen beside it, never from the contract that has kept moving since.
    */
    expect(target).toBe(resolve(join(handoffDir(root), "tokens.css")));
    expect(target).not.toBe(resolve(tokensCssPath(root)));
  });
});
