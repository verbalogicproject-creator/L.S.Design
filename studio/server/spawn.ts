import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { StudioError } from "../shared/schema.ts";
import { activeLock } from "./lock.ts";
import { probeHealth } from "./client.ts";

const here = dirname(fileURLToPath(import.meta.url));

export interface AttachResult {
  url: string;
  port: number;
  spawned: boolean;
}

/**
 * Attaches to the studio that already owns this project, or starts one detached.
 * The MCP entry is a separate process from the HTTP server on purpose: the
 * control room outlives any single agent session, and several clients can attach.
 */
export async function attachOrSpawn(
  projectRoot: string,
  options: { port?: number | undefined; timeoutMs?: number } = {},
): Promise<AttachResult> {
  const existing = activeLock(projectRoot);
  if (existing) {
    const url = `http://127.0.0.1:${existing.port}`;
    if (await probeHealth(url)) return { url, port: existing.port, spawned: false };
  }

  const port = options.port ?? 4177;
  const entry = cliEntry();
  const child = spawn(process.execPath, [entry, "--project", projectRoot, "--port", String(port)], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, LS_DESIGN_DETACHED: "1" },
  });
  child.unref();

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + (options.timeoutMs ?? 20_000);
  while (Date.now() < deadline) {
    if (await probeHealth(url)) return { url, port, spawned: true };
    await delay(250);
  }
  throw new StudioError("E_NO_STUDIO", `the studio did not become reachable at ${url} within the timeout`);
}

/** `cli.ts` in the source tree, `cli.js` in the published package. */
export function cliEntry(): string {
  for (const candidate of [resolve(here, "cli.js"), resolve(here, "cli.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return resolve(here, "cli.ts");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
