import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { StudioError } from "../shared/schema.ts";

const execFileAsync = promisify(execFile);

/** Verified fixed install on this box; never scan the filesystem for it. */
const DEFAULT_CHROMIUM =
  "/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-linux/headless_shell";

const CANDIDATE_CHROMIUM = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

export interface ShotRequest {
  url?: string;
  htmlPath?: string;
  widths: number[];
  outDir: string;
  fullPage?: boolean;
  height?: number;
  timeoutMs?: number;
}

export interface ShotResult {
  files: string[];
  chromium: string;
}

/**
 * Resolves a chromium-family binary to use for screenshots, in priority order:
 * an explicit `LS_DESIGN_CHROMIUM` override, the chromium headless_shell known
 * to be installed on this box, then a short list of common system installs.
 * Never scans the filesystem.
 */
export function resolveChromium(): string | null {
  const envPath = process.env.LS_DESIGN_CHROMIUM;
  if (envPath && existsSync(envPath)) return envPath;
  if (existsSync(DEFAULT_CHROMIUM)) return DEFAULT_CHROMIUM;
  for (const candidate of CANDIDATE_CHROMIUM) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function screenshot(request: ShotRequest): Promise<ShotResult> {
  const chromium = resolveChromium();
  if (!chromium) {
    throw new StudioError(
      "E_NO_CHROMIUM",
      "no chromium binary found; set LS_DESIGN_CHROMIUM or install one",
    );
  }

  const hasUrl = typeof request.url === "string" && request.url.length > 0;
  const hasHtmlPath = typeof request.htmlPath === "string" && request.htmlPath.length > 0;
  if (hasUrl === hasHtmlPath) {
    throw new StudioError("E_INVALID_FILE", "exactly one of url or htmlPath is required");
  }

  let targetUrl: string;
  let slug: string;
  if (hasHtmlPath) {
    const absolutePath = resolve(request.htmlPath as string);
    if (!existsSync(absolutePath)) {
      throw new StudioError("E_INVALID_FILE", `no such file: ${request.htmlPath}`);
    }
    targetUrl = pathToFileURL(absolutePath).href;
    slug = slugify(basename(absolutePath, extname(absolutePath)));
  } else {
    targetUrl = request.url as string;
    slug = "page";
  }

  const outDir = resolve(request.outDir);
  await mkdir(outDir, { recursive: true });

  const height = request.height ?? 1024;
  const fullPage = request.fullPage ?? true;
  const timeoutMs = request.timeoutMs ?? 30000;
  const widths = [...request.widths].sort((a, b) => a - b);
  const outFiles = widths.map((width) => join(outDir, `${slug}-${width}.png`));

  const renderedByPlaywright = await tryPlaywright({
    chromium,
    targetUrl,
    widths,
    outFiles,
    height,
    fullPage,
    timeoutMs,
  });

  if (!renderedByPlaywright) {
    await renderWithSpawnedChromium({ chromium, targetUrl, widths, outFiles, height, timeoutMs });
  }

  for (const file of outFiles) {
    await verifyPng(file);
  }

  return { files: outFiles, chromium };
}

interface RenderPlan {
  chromium: string;
  targetUrl: string;
  widths: number[];
  outFiles: string[];
  height: number;
  timeoutMs: number;
}

async function tryPlaywright(plan: RenderPlan & { fullPage: boolean }): Promise<boolean> {
  let playwright: typeof import("playwright-core");
  try {
    playwright = await import("playwright-core");
  } catch {
    return false;
  }

  let browser: Awaited<ReturnType<typeof playwright.chromium.launch>> | undefined;
  try {
    browser = await playwright.chromium.launch({
      executablePath: plan.chromium,
      args: ["--no-sandbox"],
    });
    for (let index = 0; index < plan.widths.length; index += 1) {
      const width = plan.widths[index] as number;
      const outFile = plan.outFiles[index] as string;
      const page = await browser.newPage({ viewport: { width, height: plan.height } });
      try {
        await page.goto(plan.targetUrl, { timeout: plan.timeoutMs });
        await page.screenshot({ path: outFile, fullPage: plan.fullPage });
      } finally {
        await page.close();
      }
    }
    await browser.close();
    return true;
  } catch {
    try {
      await browser?.close();
    } catch {
      /* best effort cleanup only */
    }
    return false;
  }
}

async function renderWithSpawnedChromium(plan: RenderPlan): Promise<void> {
  for (let index = 0; index < plan.widths.length; index += 1) {
    const width = plan.widths[index] as number;
    const outFile = plan.outFiles[index] as string;
    const args = [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      `--screenshot=${outFile}`,
      `--window-size=${width},${plan.height}`,
      plan.targetUrl,
    ];
    try {
      await execFileAsync(plan.chromium, args, { timeout: plan.timeoutMs });
    } catch (error) {
      throw new StudioError(
        "E_INVALID_FILE",
        `chromium failed to render ${plan.targetUrl} at width ${width}: ${String(error)}`,
        { width },
      );
    }
  }
}

async function verifyPng(file: string): Promise<void> {
  let buffer: Buffer;
  try {
    buffer = await readFile(file);
  } catch {
    throw new StudioError("E_INVALID_FILE", `expected a screenshot at ${file}`);
  }
  const isPng =
    buffer.length >= 4 && PNG_SIGNATURE.every((byte, index) => buffer[index] === byte);
  if (!isPng) {
    throw new StudioError("E_INVALID_FILE", `${file} is not a valid PNG`);
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "page" : slug;
}
