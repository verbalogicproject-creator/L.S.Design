import { randomBytes } from "node:crypto";

/** Stable id prefixes. Screens and requests are addressed by these everywhere. */
export const ID_PREFIX = {
  screen: "scr",
  request: "req",
} as const;

export function newId(kind: keyof typeof ID_PREFIX): string {
  return `${ID_PREFIX[kind]}_${randomBytes(4).toString("hex")}`;
}

/**
 * Filesystem-safe slug. Used for `design/screens/<slug>/`, so it must stay
 * stable for a screen's whole life and must never contain a path separator.
 */
export function slugify(value: string, fallback = "screen"): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

/** Appends `-2`, `-3`, ... until the slug is unused. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
