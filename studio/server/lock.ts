import { existsSync, readFileSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";

import { StudioError } from "../shared/schema.ts";
import { lockPath } from "../shared/paths.ts";

export interface LockFile {
  pid: number;
  port: number;
  startedAt: string;
}

export function readLock(projectRoot: string): LockFile | null {
  const path = lockPath(projectRoot);
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof (parsed as LockFile).pid === "number" &&
      typeof (parsed as LockFile).port === "number"
    ) {
      return parsed as LockFile;
    }
  } catch {
    /* a corrupt lock is treated as no lock */
  }
  return null;
}

/** A lock whose process is gone is stale and may be taken over. */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function activeLock(projectRoot: string): LockFile | null {
  const lock = readLock(projectRoot);
  if (!lock) return null;
  if (lock.pid === process.pid) return lock;
  return isAlive(lock.pid) ? lock : null;
}

export async function acquireLock(projectRoot: string, port: number): Promise<LockFile> {
  const held = activeLock(projectRoot);
  if (held && held.pid !== process.pid) {
    throw new StudioError("E_PROJECT_LOCKED", `another studio (pid ${held.pid}) already owns this project`, {
      pid: held.pid,
      port: held.port,
    });
  }
  const lock: LockFile = { pid: process.pid, port, startedAt: new Date().toISOString() };
  await writeFile(lockPath(projectRoot), `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return lock;
}

export async function releaseLock(projectRoot: string): Promise<void> {
  const lock = readLock(projectRoot);
  if (lock && lock.pid !== process.pid) return;
  await rm(lockPath(projectRoot), { force: true });
}
