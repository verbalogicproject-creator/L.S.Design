import { Hono } from "hono";
import { z } from "zod";

import type { Env } from "./context.ts";
import { StudioError, requestTypeSchema, toolInput } from "../../shared/schema.ts";

const decisionBody = z.object({
  state: z.enum(["approved", "rejected"]),
  notes: z.string().max(4000).optional(),
  followUp: requestTypeSchema.optional(),
  // Defaults to "human" because the browser is the only caller that omits it;
  // the MCP entry always sends "agent", and the service refuses an agent approval.
  by: z.enum(["human", "agent"]).default("human"),
  ifRev: z.number().int().positive().optional(),
});

const canvasBody = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const addBody = toolInput.studio_add_screen;
const updateBody = toolInput.studio_update_screen;

export function screenRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.post("/screens", async (context) => {
    const parsed = addBody.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new StudioError("E_INVALID_FILE", "invalid screen body", { issues: parsed.error.issues });
    }
    const { screen, rev } = await context.get("service").addScreen(parsed.data);
    return context.json({ screenId: screen.id, slug: screen.slug, revision: screen.revision, rev });
  });

  app.post("/screens/:id/revision", async (context) => {
    const payload = { ...(await context.req.json().catch(() => ({}))), screenId: context.req.param("id") };
    const parsed = updateBody.safeParse(payload);
    if (!parsed.success) {
      throw new StudioError("E_INVALID_FILE", "invalid revision body", { issues: parsed.error.issues });
    }
    const { screen, rev } = await context.get("service").updateScreen(parsed.data);
    return context.json({ screenId: screen.id, revision: screen.revision, rev });
  });

  app.post("/screens/:id/decision", async (context) => {
    const parsed = decisionBody.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new StudioError("E_INVALID_FILE", "invalid decision body", { issues: parsed.error.issues });
    }
    const result = await context.get("service").setDecision({
      screenId: context.req.param("id"),
      state: parsed.data.state,
      notes: parsed.data.notes,
      by: parsed.data.by,
      followUp: parsed.data.followUp,
      ifRev: parsed.data.ifRev,
    });
    return context.json(result);
  });

  app.patch("/screens/:id/canvas", async (context) => {
    const parsed = canvasBody.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new StudioError("E_INVALID_FILE", "invalid canvas body", { issues: parsed.error.issues });
    }
    const result = await context
      .get("service")
      .moveScreen(context.req.param("id"), parsed.data.x, parsed.data.y);
    return context.json(result);
  });

  return app;
}
