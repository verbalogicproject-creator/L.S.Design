import { Hono } from "hono";
import { z } from "zod";

import type { Env } from "./context.ts";
import { StudioError, requestTypeSchema } from "../../shared/schema.ts";

const resolveBody = z.object({
  state: z.enum(["done", "failed"]),
  result: z.record(z.string(), z.unknown()).optional(),
});

const createBody = z.object({
  type: requestTypeSchema,
  screenId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export function requestRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.post("/requests", async (context) => {
    const parsed = createBody.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new StudioError("E_INVALID_FILE", "invalid request body", { issues: parsed.error.issues });
    }
    const result = await context
      .get("service")
      .createRequest(parsed.data.type, parsed.data.screenId, parsed.data.payload ?? {});
    return context.json(result);
  });

  app.post("/requests/:id/claim", async (context) => {
    const payload = (await context.req.json().catch(() => ({}))) as { claimedBy?: string };
    const service = context.get("service");
    const request = await service.claimRequest(context.req.param("id"), payload.claimedBy ?? "agent");
    return context.json({ request, rev: service.state().rev });
  });

  app.post("/requests/:id/resolve", async (context) => {
    const parsed = resolveBody.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new StudioError("E_INVALID_FILE", "invalid resolve body", { issues: parsed.error.issues });
    }
    const service = context.get("service");
    const request = await service.resolveRequest(
      context.req.param("id"),
      parsed.data.state,
      parsed.data.result,
    );
    return context.json({ request, rev: service.state().rev });
  });

  app.post("/requests/:id/cancel", async (context) => {
    const service = context.get("service");
    const request = await service.resolveRequest(context.req.param("id"), "cancelled");
    return context.json({ request, rev: service.state().rev });
  });

  return app;
}
