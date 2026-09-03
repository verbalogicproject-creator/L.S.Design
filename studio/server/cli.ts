#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { StudioError } from "../shared/schema.ts";
import { designMdPath, handoffDir, lockPath } from "../shared/paths.ts";
import { startServer } from "./http.ts";
import { startMcp } from "./mcp.ts";
import { initProject } from "./init.ts";
import { DesignStore } from "./store.ts";
import { StudioService } from "./service.ts";
import { exportHandoff } from "./handoff/export.ts";
import { resolveChromium, screenshot } from "./screenshot.ts";
import { emitTailwindThemeCss, emitTokensCss } from "../shared/tokens.ts";
import { activeLock } from "./lock.ts";
import {
  formatLintReport,
  lintBuildSource,
  lintBuiltPage,
  mergeResults,
  readContractTokens,
} from "./lint-build.ts";
import { isOnline } from "./online.ts";

const USAGE = `ls-design-studio — local design control room

Usage
  ls-design-studio [--project <dir>] [--port 4177] [--open]   start the studio
  ls-design-studio init --project <dir> [--name N] [--lang en] [--dir ltr]
  ls-design-studio mcp --project <dir>                        stdio MCP entry
  ls-design-studio tokens --project <dir> --emit css|tailwind|stitch
  ls-design-studio handoff --project <dir> [--force]
  ls-design-studio screenshot (--url U | --html F) [--widths 360,768,1440] --out <dir>
  ls-design-studio lint-build --project <dir> [--src <dir>] [--url U] [--widths 360,768,1440] [--json]
  ls-design-studio doctor [--project <dir>]

The studio holds no API keys and binds to the loopback address only.`;

interface Flags {
  command: string;
  project: string;
  values: Map<string, string>;
  booleans: Set<string>;
}

function parseArgv(argv: string[]): Flags {
  const values = new Map<string, string>();
  const booleans = new Set<string>();
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) continue;
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      booleans.add(key);
    } else {
      values.set(key, next);
      index += 1;
    }
  }
  const known = new Set(["init", "mcp", "tokens", "handoff", "screenshot", "lint-build", "doctor", "serve"]);
  const command = positional.find((token) => known.has(token)) ?? "serve";
  return { command, project: resolve(values.get("project") ?? process.cwd()), values, booleans };
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const flags = parseArgv(argv);

  switch (flags.command) {
    case "init":
      return commandInit(flags);
    case "mcp":
      return commandMcp(flags);
    case "tokens":
      return commandTokens(flags);
    case "handoff":
      return commandHandoff(flags);
    case "screenshot":
      return commandScreenshot(flags);
    case "lint-build":
      return commandLintBuild(flags);
    case "doctor":
      return commandDoctor(flags);
    default:
      return commandServe(flags);
  }
}

/**
 * Checks a built implementation against the contract it was built from. The
 * static half always runs; the live half runs when a --url is given, because
 * the checks that matter most (token drift, a page that is blank without
 * scripting) are only observable in a browser.
 */
async function commandLintBuild(flags: Flags): Promise<number> {
  const tokens = await readContractTokens(flags.project);
  const widths = (flags.values.get("widths") ?? "360,768,1440")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  const staticResult = await lintBuildSource({
    projectRoot: flags.project,
    srcDir: flags.values.get("src"),
  });

  const url = flags.values.get("url");
  let result = staticResult;
  if (url !== undefined) {
    if (tokens.size === 0) {
      console.error("lint-build: no tokens.css found; run this from a project with a design contract");
      return 2;
    }
    const pageResult = await lintBuiltPage({
      url,
      tokens,
      widths,
      chromiumPath: flags.values.get("chromium"),
    });
    result = mergeResults(staticResult, pageResult);
  } else {
    result = mergeResults(staticResult, {
      checks: [{ name: "live page checks", status: "skipped", detail: "pass --url to run them" }],
      findings: [],
      ok: true,
    });
  }

  if (flags.booleans.has("json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`lint-build — ${flags.project}`);
    console.log(formatLintReport(result));
    console.log(result.ok ? "\npassed" : "\nfailed");
  }
  return result.ok ? 0 : 1;
}

async function commandInit(flags: Flags): Promise<number> {
  const dirValue = flags.values.get("dir");
  const result = await initProject({
    projectRoot: flags.project,
    name: flags.values.get("name"),
    description: flags.values.get("description"),
    lang: flags.values.get("lang"),
    dir: dirValue === "rtl" ? "rtl" : dirValue === "ltr" ? "ltr" : undefined,
    force: flags.booleans.has("force"),
  });
  for (const file of result.created) console.log(`created design/${file}`);
  for (const file of result.existing) console.log(`kept    design/${file}`);
  console.log(`\nOpen design/preview.html to confirm the contract, then run:\n  ls-design-studio --project ${flags.project}`);
  return 0;
}

async function commandServe(flags: Flags): Promise<number> {
  requireDesignMd(flags.project);
  const portValue = flags.values.get("port");
  const server = await startServer({
    projectRoot: flags.project,
    ...(portValue ? { port: Number(portValue) } : {}),
  });
  console.log(`L.S.Design Studio  ${server.url}`);
  console.log(`project            ${flags.project}`);
  console.log(`screens            ${server.service.state().screens.length}`);
  console.log("\nPress Ctrl+C to stop.");
  if (flags.booleans.has("open")) await openBrowser(server.url);
  await new Promise(() => undefined);
  return 0;
}

async function commandMcp(flags: Flags): Promise<number> {
  const portValue = flags.values.get("port");
  await startMcp({
    projectRoot: flags.project,
    ...(portValue ? { port: Number(portValue) } : {}),
  });
  await new Promise(() => undefined);
  return 0;
}

async function commandTokens(flags: Flags): Promise<number> {
  requireDesignMd(flags.project);
  const store = await DesignStore.open(flags.project);
  const service = new StudioService(store);
  const emit = flags.values.get("emit") ?? "css";
  const { model } = await service.tokenModel();

  if (emit === "css") process.stdout.write(emitTokensCss(model));
  else if (emit === "tailwind") process.stdout.write(emitTailwindThemeCss(model));
  else if (emit === "stitch") process.stdout.write(await service.stitchDesignMd());
  else {
    console.error(`unknown --emit ${emit}; expected css, tailwind, or stitch`);
    return 2;
  }
  return 0;
}

async function commandHandoff(flags: Flags): Promise<number> {
  requireDesignMd(flags.project);
  const store = await DesignStore.open(flags.project);
  const service = new StudioService(store);
  const result = await exportHandoff(store, {
    force: flags.booleans.has("force"),
    online: await isOnline(),
  });
  await service.recordGate(result.gatePassed, result.sha256);
  console.log(`${result.gatePassed ? "handoff written" : "handoff written WITHOUT a passing gate"}`);
  console.log(`path    ${result.path}`);
  console.log(`screens ${result.screens}`);
  console.log(`sha256  ${result.sha256}`);
  return 0;
}

async function commandScreenshot(flags: Flags): Promise<number> {
  const widths = (flags.values.get("widths") ?? "360,768,1440")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  const request: Parameters<typeof screenshot>[0] = {
    widths,
    outDir: resolve(flags.values.get("out") ?? "screenshots"),
    fullPage: !flags.booleans.has("no-full-page"),
  };
  const url = flags.values.get("url");
  const html = flags.values.get("html");
  if (url) request.url = url;
  if (html) request.htmlPath = resolve(html);

  const result = await screenshot(request);
  for (const file of result.files) console.log(file);
  return 0;
}

async function commandDoctor(flags: Flags): Promise<number> {
  const chromium = resolveChromium();
  const lock = activeLock(flags.project);
  const hasDesign = existsSync(designMdPath(flags.project));
  const hasHandoff = existsSync(handoffDir(flags.project));

  console.log(`node          ${process.version}`);
  console.log(`project       ${flags.project}`);
  console.log(`design/       ${hasDesign ? "present" : "missing — run: ls-design-studio init"}`);
  console.log(`handoff/      ${hasHandoff ? "present" : "not exported"}`);
  console.log(`chromium      ${chromium ?? "not found — set LS_DESIGN_CHROMIUM"}`);
  console.log(`network       ${(await isOnline()) ? "reachable" : "offline — screens render from PNG"}`);
  console.log(`lock          ${lock ? `held by pid ${lock.pid} on port ${lock.port}` : `free (${lockPath(flags.project)})`}`);

  if (hasDesign) {
    try {
      const store = await DesignStore.open(flags.project);
      const service = new StudioService(store);
      const gate = service.gate();
      console.log(`screens       ${store.snapshot().screens.length}`);
      console.log(
        `gate          ${gate.canPass ? "ready" : `blocked (${gate.pending.length} pending, ${gate.rejected.length} rejected, ${gate.stale.length} stale, ${gate.pendingReapply} reapply)`}`,
      );
    } catch (error) {
      console.log(`state         unreadable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return chromium ? 0 : 0;
}

function requireDesignMd(projectRoot: string): void {
  if (!existsSync(designMdPath(projectRoot))) {
    throw new StudioError(
      "E_NO_STUDIO",
      `no design/DESIGN.md under ${projectRoot}\nRun: ls-design-studio init --project ${projectRoot}`,
    );
  }
}

async function openBrowser(url: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* opening a browser is a convenience, never a failure */
  }
}

main(process.argv.slice(2))
  .then((code) => {
    if (code !== 0) process.exit(code);
  })
  .catch((error: unknown) => {
    if (error instanceof StudioError) {
      console.error(`${error.code}: ${error.message}`);
      if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
    } else {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    }
    process.exit(1);
  });
