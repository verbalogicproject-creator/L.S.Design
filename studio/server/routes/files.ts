import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

import { Hono } from "hono";

import type { Env } from "./context.ts";
import { designDir, safeRelative } from "../../shared/paths.ts";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Generated screen HTML needs a real origin for its stylesheet CDN, fonts and
 * images, so it is served rather than inlined. It is rendered inside an iframe
 * with `sandbox="allow-scripts"` and no `allow-same-origin`, and this per-route
 * policy is the second half of that containment.
 */
/*
  'self' is what lets a token-driven screen load the project's own tokens.css
  and vendored font files from this server. The remote origins remain for baked
  screens from an external generator, which need their CDN to paint at all.
  connect-src stays 'none': a screen renders, it never calls anything.
*/
const SCREEN_CSP = [
  "default-src 'none'",
  "script-src 'self' https://cdn.tailwindcss.com 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join("; ");

export function fileRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.get("/*", async (context) => {
    const service = context.get("service");
    const root = resolve(designDir(service.projectRoot));
    const requested = decodeURIComponent(context.req.path.replace(/^\/files\/?/, ""));

    let relativePath: string;
    try {
      relativePath = safeRelative(requested);
    } catch {
      return context.text("forbidden", 403);
    }
    if (relativePath === "") return context.text("not found", 404);

    const absolute = resolve(join(root, relativePath));
    const inside = relative(root, absolute);
    if (inside.startsWith("..") || inside.startsWith(`..${sep}`)) {
      return context.text("forbidden", 403);
    }
    if (!existsSync(absolute) || !(await stat(absolute)).isFile()) {
      return context.text("not found", 404);
    }

    const extension = extname(absolute).toLowerCase();
    const body = await readFile(absolute);
    const headers: Record<string, string> = {
      "content-type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    };
    if (extension === ".html") headers["content-security-policy"] = SCREEN_CSP;
    return context.body(new Uint8Array(body), 200, headers);
  });

  return app;
}
