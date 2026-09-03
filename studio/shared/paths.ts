import { join } from "node:path";

/** Everything the studio owns lives under `<project>/design/`. */
export const DESIGN_DIR = "design";

export function designDir(projectRoot: string): string {
  return join(projectRoot, DESIGN_DIR);
}
export function designMdPath(projectRoot: string): string {
  return join(designDir(projectRoot), "DESIGN.md");
}
export function designJsonPath(projectRoot: string): string {
  return join(designDir(projectRoot), "design.json");
}
export function tokensCssPath(projectRoot: string): string {
  return join(designDir(projectRoot), "tokens.css");
}
export function tailwindThemePath(projectRoot: string): string {
  return join(designDir(projectRoot), "tailwind.theme.css");
}
export function previewPath(projectRoot: string): string {
  return join(designDir(projectRoot), "preview.html");
}
export function lockPath(projectRoot: string): string {
  return join(designDir(projectRoot), ".studio.lock");
}
export function screensDir(projectRoot: string): string {
  return join(designDir(projectRoot), "screens");
}
export function refsDir(projectRoot: string): string {
  return join(designDir(projectRoot), "refs");
}
export function handoffDir(projectRoot: string): string {
  return join(designDir(projectRoot), "handoff");
}

/** `design/screens/<slug>/r<N>/` — one directory per revision, never overwritten. */
export function revisionDir(projectRoot: string, slug: string, revision: number): string {
  return join(screensDir(projectRoot), slug, `r${revision}`);
}

/** The path stored in design.json: relative to `design/`, forward slashes only. */
export function revisionRelative(slug: string, revision: number, file: "code.html" | "screen.png"): string {
  return `screens/${slug}/r${revision}/${file}`;
}

/** Rejects traversal and absolute paths before a relative path is joined. */
export function safeRelative(relative: string): string {
  const normalized = relative.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`absolute path refused: ${relative}`);
  }
  const parts = normalized.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) {
    throw new Error(`path traversal refused: ${relative}`);
  }
  return parts.join("/");
}
