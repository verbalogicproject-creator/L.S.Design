import { Hono } from "hono";

import type { Env } from "./context.ts";
import { isOnline } from "../online.ts";

export function statusRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.get("/state", (context) => context.json(context.get("service").state()));

  app.get("/status", async (context) => {
    const service = context.get("service");
    const state = service.state();
    return context.json({
      rev: state.rev,
      seq: state.seq,
      status: state.status,
      online: await isOnline(),
      tokensHash: state.tokensHash,
      project: state.project,
      screens: state.screens,
      pendingRequests: state.requests.filter((request) => request.state === "pending" || request.state === "claimed"),
      gate: service.gate(),
    });
  });

  return app;
}
