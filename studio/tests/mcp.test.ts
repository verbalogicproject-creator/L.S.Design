import { describe, expect, it } from "vitest";

import { buildToolList } from "../server/mcp.ts";
import { TOOL_NAMES, toolInput } from "../shared/schema.ts";

describe("tool list", () => {
  const tools = buildToolList();

  it("exposes every declared tool exactly once", () => {
    expect(tools.map((tool) => tool.name)).toEqual([...TOOL_NAMES]);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
  });

  it("gives every tool a description an agent can route on", () => {
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.description).not.toMatch(/TODO|TBD/i);
    }
  });

  it("publishes a JSON Schema object for every input", () => {
    for (const tool of tools) {
      const schema = tool.inputSchema as { type?: string; properties?: Record<string, unknown> };
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
    }
  });

  it("keeps the wait timeout inside the documented bounds", () => {
    const parsed = toolInput.studio_wait_for_decision.safeParse({ cursor: 0, timeoutSec: 301 });
    expect(parsed.success).toBe(false);
    expect(toolInput.studio_wait_for_decision.parse({}).timeoutSec).toBe(120);
    expect(toolInput.studio_wait_for_decision.parse({}).cursor).toBe(0);
  });

  it("defaults a decision recorded over MCP to the agent, never the person", () => {
    expect(toolInput.studio_set_decision.parse({ screenId: "scr_0000000a", state: "rejected" }).by).toBe("agent");
  });

  it("defaults screenshot widths to the three review widths", () => {
    expect(toolInput.studio_screenshot.parse({ outDir: "/tmp/x" }).widths).toEqual([360, 768, 1440]);
  });

  it("validates ids by shape", () => {
    expect(toolInput.studio_claim_request.safeParse({ requestId: "req_0000000a" }).success).toBe(true);
    expect(toolInput.studio_claim_request.safeParse({ requestId: "scr_0000000a" }).success).toBe(false);
    expect(toolInput.studio_claim_request.safeParse({ requestId: "req_XYZ" }).success).toBe(false);
  });
});
