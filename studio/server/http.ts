import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

import { Hono } from "hono";
import { serve } from "@hono/node-server";

import { StudioError, errorStatus } from "../shared/schema.ts";
import { DesignStore } from "./store.ts";
import { StudioService } from "./service.ts";
import type { Env } from "./routes/context.ts";
import { statusRoutes } from "./routes/status.ts";
import { screenRoutes } from "./routes/screens.ts";
import { requestRoutes } from "./routes/requests.ts";
import { tokenRoutes } from "./routes/tokens.ts";
import { eventRoutes } from "./routes/events.ts";
import { fileRoutes } from "./routes/files.ts";
import { handoffRoutes } from "./routes/handoff.ts";
import { acquireLock, releaseLock } from "./lock.ts";

const here = dirname(fileURLToPath(import.meta.url));
// The built control room is preferred; the source folder is only a development
// convenience and must never be the first candidate, so source is not served.
const APP_ROOTS = [
  resolve(here, "..", "dist", "app"),
  resolve(here, "..", "app"),
];

const APP_CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

/** The control room itself: no remote origins, no inline event handlers. */
const APP_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

export function createApp(service: StudioService): Hono<Env> {
  const app = new Hono<Env>();

  app.use("*", async (context, next) => {
    context.set("service", service);
    await next();
  });

  app.onError((error, context) => {
    if (error instanceof StudioError) {
      return context.json({ error: error.toJSON() }, errorStatus[error.code] as 400);
    }
    const message = error instanceof Error ? error.message : String(error);
    return context.json({ error: { code: "E_INTERNAL", message } }, 500);
  });

  const api = new Hono<Env>();
  api.route("/", statusRoutes());
  api.route("/", screenRoutes());
  api.route("/", requestRoutes());
  api.route("/", tokenRoutes());
  api.route("/", eventRoutes());
  api.route("/", handoffRoutes());
  app.route("/api", api);

  app.route("/files", fileRoutes());

  app.get("/healthz", (context) => context.json({ ok: true, rev: service.state().rev }));

  // The built control room, when it exists. In development Vite serves it instead.
  app.get("/*", async (context) => {
    const root = APP_ROOTS.find((candidate) => existsSync(join(candidate, "index.html")));
    if (!root) {
      return context.html(devFallbackPage(), 200, { "content-security-policy": APP_CSP });
    }
    const requested = context.req.path === "/" ? "index.html" : context.req.path.replace(/^\//, "");
    const candidate = resolve(join(root, requested));
    const file = candidate.startsWith(resolve(root)) && existsSync(candidate) && extname(candidate)
      ? candidate
      : join(root, "index.html");
    const body = await readFile(file);
    return context.body(new Uint8Array(body), 200, {
      "content-type": APP_CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
      "content-security-policy": APP_CSP,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
  });

  return app;
}

export interface StudioServer {
  url: string;
  port: number;
  service: StudioService;
  close(): Promise<void>;
}

/**
 * Binds to the loopback address only. The studio holds no credentials, but it
 * does expose the project's design folder, so it is never reachable off-host.
 */
export async function startServer(options: {
  projectRoot: string;
  port?: number;
  host?: string;
}): Promise<StudioServer> {
  const projectRoot = resolve(options.projectRoot);
  const store = await DesignStore.open(projectRoot);
  const service = new StudioService(store);
  const app = createApp(service);
  const host = options.host ?? "127.0.0.1";
  const requested = options.port ?? 4177;

  const server = await listen(app, requested, host);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requested;
  await acquireLock(projectRoot, port);

  const close = async (): Promise<void> => {
    await releaseLock(projectRoot);
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void close().then(() => process.exit(0));
    });
  }

  return { url: `http://${host}:${port}`, port, service, close };
}

function listen(app: Hono<Env>, port: number, hostname: string): Promise<Server> {
  return new Promise((resolveServer, rejectServer) => {
    const server = serve({ fetch: app.fetch, port, hostname }, () => resolveServer(server as Server));
    (server as Server).on("error", rejectServer);
  });
}

function devFallbackPage(): string {
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    "<title>L.S.Design Studio</title>",
    "<style>body{font:16px/1.6 system-ui;margin:0;padding:2rem;background:#f7f5f2;color:#1a1917}",
    "code{background:#fff;border:1px solid #e2ded6;border-radius:4px;padding:.1rem .3rem}</style>",
    "</head><body>",
    "<h1>L.S.Design Studio</h1>",
    "<p>The API is running. The control room has not been built yet.</p>",
    "<p>Run <code>npm run build:app</code> to build it, or <code>npm run dev:app</code> to develop against this server.</p>",
    '<p>The API is reachable at <code>/api/status</code>.</p>',
    "</body></html>",
  ].join("\n");
}
