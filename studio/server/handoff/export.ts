import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative as relativePath } from "node:path";

import { StudioError } from "../../shared/schema.ts";
import {
  designDir,
  designMdPath,
  handoffDir,
  safeRelative,
  tailwindThemePath,
  tokensCssPath,
} from "../../shared/paths.ts";
import { sha256 } from "../../shared/hash.ts";
import { computeGate, joinDesign, type DesignStore } from "../store.ts";
import { detectFixtures } from "./fixtures.ts";
import { renderBrief } from "./brief.ts";

export interface ExportOptions {
  force?: boolean;
  online?: boolean;
}

export interface ExportResult {
  path: string;
  sha256: string;
  screens: number;
  gatePassed: boolean;
}

const TARGET_STACK = {
  framework: "vite-react",
  styling: "tailwind-v4",
  typescript: true,
  tokensVia: "css-vars",
  routerSkill: "ls-design-websites",
} as const;

/**
 * Writes `design/handoff/` fresh from the current, gate-checked state. Never
 * mutates the store; the caller is responsible for recording the gate result.
 */
export async function exportHandoff(store: DesignStore, options: ExportOptions = {}): Promise<ExportResult> {
  const snapshot = store.snapshot();
  const gate = computeGate(snapshot);
  if (!gate.canPass && !options.force) {
    throw new StudioError("E_GATE_BLOCKED", "the approval gate has not passed", {
      pending: gate.pending,
      rejected: gate.rejected,
      stale: gate.stale,
      pendingReapply: gate.pendingReapply,
    });
  }

  const root = store.projectRoot;
  const dir = handoffDir(root);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  await copyIfPresent(designMdPath(root), join(dir, "DESIGN.md"));
  await copyIfPresent(tokensCssPath(root), join(dir, "tokens.css"));
  await copyIfPresent(tailwindThemePath(root), join(dir, "tailwind.theme.css"));
  /*
    A token-driven screen paints with vendored faces, so the handoff has to
    carry them. Without these the build would fall back to a system serif and
    look nothing like the screen the person approved.
  */
  await copyIfPresent(join(designDir(root), "fonts.css"), join(dir, "fonts.css"));
  await copyDirectoryIfPresent(join(designDir(root), "fonts"), join(dir, "fonts"));

  await writeFile(join(dir, "design.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const approvedScreens = snapshot.screens.filter((screen) => screen.decision.state === "approved");
  const fixtureCounts: Record<string, number> = {};
  const screensJson: Array<Record<string, unknown>> = [];

  await mkdir(join(dir, "screens"), { recursive: true });
  await mkdir(join(dir, "fixtures"), { recursive: true });

  for (const screen of approvedScreens) {
    const screenDirRelative = safeRelative(`screens/${screen.slug}`);
    const screenDir = join(dir, screenDirRelative);
    await mkdir(screenDir, { recursive: true });

    const htmlSource = joinDesign(root, screen.files.html);
    const pngSource = joinDesign(root, screen.files.png);
    const htmlContent = await readFile(htmlSource, "utf8");
    const pngContent = await readFile(pngSource);

    const htmlRelative = safeRelative(`${screenDirRelative}/code.html`);
    const pngRelative = safeRelative(`${screenDirRelative}/screen.png`);
    await writeFile(join(dir, htmlRelative), htmlContent, "utf8");
    await writeFile(join(dir, pngRelative), pngContent);

    const findings = detectFixtures(htmlContent);
    fixtureCounts[screen.slug] = findings.length;
    const fixturesRelative = safeRelative(`fixtures/${screen.slug}.json`);
    await writeFile(join(dir, fixturesRelative), `${JSON.stringify(findings, null, 2)}\n`, "utf8");

    screensJson.push({
      id: screen.id,
      slug: screen.slug,
      title: screen.title,
      device: screen.device,
      width: screen.width,
      height: screen.height,
      revision: screen.revision,
      source: screen.source,
      files: { html: htmlRelative, png: pngRelative },
      decision: screen.decision,
    });
  }

  await writeFile(join(dir, "screens.json"), `${JSON.stringify(screensJson, null, 2)}\n`, "utf8");
  await writeFile(join(dir, "target_stack.json"), `${JSON.stringify(TARGET_STACK, null, 2)}\n`, "utf8");

  let designMd = "";
  try {
    designMd = await readFile(designMdPath(root), "utf8");
  } catch {
    designMd = "";
  }

  const brief = renderBrief({
    state: snapshot,
    designMd,
    targetStack: TARGET_STACK,
    fixtureCounts,
    online: options.online ?? true,
    gatePassed: gate.canPass,
  });
  await writeFile(join(dir, "BRIEF.md"), brief, "utf8");

  const digestPath = join(dir, "handoff.sha256");
  const digestContent = await computeHandoffDigest(dir);
  await writeFile(digestPath, digestContent, "utf8");

  return {
    path: dir,
    sha256: sha256(digestContent),
    screens: approvedScreens.length,
    gatePassed: gate.canPass,
  };
}

async function copyIfPresent(source: string, destination: string): Promise<void> {
  if (!existsSync(source)) return;
  const content = await readFile(source);
  await writeFile(destination, content);
}

/** Copies a flat directory of assets, such as the vendored font files. */
async function copyDirectoryIfPresent(source: string, destination: string): Promise<void> {
  if (!existsSync(source)) return;
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    await copyIfPresent(join(source, entry.name), join(destination, safeRelative(entry.name)));
  }
}

async function computeHandoffDigest(dir: string): Promise<string> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absolute = join(entry.parentPath, entry.name);
    const relative = safeRelative(relativePath(dir, absolute).replace(/\\/g, "/"));
    if (relative === "handoff.sha256") continue;
    files.push(relative);
  }
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const lines: string[] = [];
  for (const relative of files) {
    const content = await readFile(join(dir, relative));
    lines.push(`${sha256(content)}  ${relative}`);
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}
