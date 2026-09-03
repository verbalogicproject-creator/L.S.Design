import { Hono } from "hono";
import { z } from "zod";

import type { Env } from "./context.ts";
import { StudioError } from "../../shared/schema.ts";

const putBody = z.object({
  tokens: z.record(z.string(), z.unknown()),
  ifRev: z.number().int().positive().optional(),
  queueReapply: z.boolean().optional(),
});

export function tokenRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.get("/tokens", async (context) => {
    const service = context.get("service");
    const { frontmatter } = await service.tokenModel();
    return context.json({
      tokens: {
        name: frontmatter.name,
        description: frontmatter.description,
        colors: frontmatter.colors ?? {},
        typography: frontmatter.typography ?? {},
        rounded: frontmatter.rounded ?? {},
        spacing: frontmatter.spacing ?? {},
        components: frontmatter.components ?? {},
      },
      tokensHash: service.state().tokensHash,
      contrast: await service.contrast(),
    });
  });

  app.put("/tokens", async (context) => {
    const parsed = putBody.safeParse(await context.req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new StudioError("E_TOKENS_INVALID", "invalid token body", { issues: parsed.error.issues });
    }
    const options: { ifRev?: number; queueReapply?: boolean } = {};
    if (parsed.data.ifRev !== undefined) options.ifRev = parsed.data.ifRev;
    if (parsed.data.queueReapply !== undefined) options.queueReapply = parsed.data.queueReapply;
    return context.json(await context.get("service").setTokens(parsed.data.tokens, options));
  });

  return app;
}
