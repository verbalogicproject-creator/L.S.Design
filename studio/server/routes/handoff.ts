import { Hono } from "hono";
import { z } from "zod";

import type { Env } from "./context.ts";
import { isOnline } from "../online.ts";
import { exportHandoff } from "../handoff/export.ts";

const body = z.object({ force: z.boolean().optional() });

export function handoffRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.post("/handoff", async (context) => {
    const parsed = body.safeParse(await context.req.json().catch(() => ({})));
    const force = parsed.success ? parsed.data.force === true : false;
    const service = context.get("service");
    const result = await exportHandoff(service.store, { force, online: await isOnline() });
    await service.recordGate(result.gatePassed, result.sha256);
    return context.json(result);
  });

  return app;
}
