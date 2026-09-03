import { resolve } from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { StudioError, TOOL_NAMES, toolInput, type ToolName } from "../shared/schema.ts";
import { StudioClient } from "./client.ts";
import { attachOrSpawn } from "./spawn.ts";
import { initProject } from "./init.ts";
import { screenshot } from "./screenshot.ts";
import { activeLock } from "./lock.ts";
import { existsSync } from "node:fs";
import { designMdPath } from "../shared/paths.ts";

const DESCRIPTIONS: Record<ToolName, string> = {
  studio_open_project:
    "Start or attach to the design studio for a project folder and return the URL to hand to the person. Runs init when design/ is missing.",
  studio_status:
    "Read the current revision, project status, connectivity, token hash, screens, pending requests, and gate state. Call this before acting.",
  studio_wait_for_decision:
    "Long-poll for human decisions and token edits. Returns as soon as anything happens after the cursor, or empty at the timeout, which is a normal outcome.",
  studio_add_screen:
    "Add a newly generated screen with both its HTML and a rendered PNG. The PNG is what the canvas paints first, so the screen stays reviewable offline.",
  studio_update_screen:
    "Replace a screen's files, creating a new revision and returning the screen to pending review.",
  studio_set_decision:
    "Record an agent-side decision on a screen. Use it to reject a screen that failed a check you ran; never use it to approve on the person's behalf.",
  studio_claim_request: "Claim a pending request so the person can see it is being worked on.",
  studio_resolve_request: "Mark a claimed request done or failed, with an optional result payload.",
  studio_get_tokens:
    "Read the design tokens, their hash, the computed contrast for every declared pair in both themes, and the full DESIGN.md text.",
  studio_set_tokens:
    "Rewrite the token frontmatter of DESIGN.md, regenerate the derived files, mark screens stale, and queue a reapplication request.",
  studio_export_handoff:
    "Write design/handoff/ when the gate passes: the brief, frozen contract, approved screens, quarantined fixtures, and a checksum manifest.",
  studio_screenshot:
    "Render a URL or a local HTML file to PNG at the given widths with headless Chromium.",
};

export interface McpOptions {
  projectRoot: string;
  port?: number | undefined;
}

export function buildToolList(): Array<{ name: string; description: string; inputSchema: unknown }> {
  return TOOL_NAMES.map((name) => ({
    name,
    description: DESCRIPTIONS[name],
    inputSchema: z.toJSONSchema(toolInput[name], { target: "draft-2020-12", io: "input" }),
  }));
}

/**
 * A stdio MCP entry that proxies to the HTTP server. Every state change goes
 * through the one writer; only the screenshot tool runs locally, because it
 * touches no state.
 */
export async function startMcp(options: McpOptions): Promise<void> {
  const projectRoot = resolve(options.projectRoot);
  const server = new Server(
    { name: "ls-design-studio", version: "2.0.0" },
    { capabilities: { tools: {} } },
  );

  let client: StudioClient | null = null;

  const ensureClient = async (): Promise<StudioClient> => {
    if (client) return client;
    const lock = activeLock(projectRoot);
    const attached = await attachOrSpawn(projectRoot, {
      port: options.port ?? lock?.port,
    });
    client = new StudioClient(attached.url);
    return client;
  };

  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: buildToolList() }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name as ToolName;
    if (!TOOL_NAMES.includes(name)) {
      return errorResult(new StudioError("E_NO_STUDIO", `unknown tool ${request.params.name}`));
    }
    const parsed = toolInput[name].safeParse(request.params.arguments ?? {});
    if (!parsed.success) {
      return errorResult(
        new StudioError("E_INVALID_FILE", `invalid arguments for ${name}`, { issues: parsed.error.issues }),
      );
    }
    try {
      return okResult(await dispatch(name, parsed.data as never, projectRoot, options, ensureClient));
    } catch (error) {
      return errorResult(error);
    }
  });

  await server.connect(new StdioServerTransport());
}

type Args = Record<string, unknown>;

async function dispatch(
  name: ToolName,
  args: Args,
  projectRoot: string,
  options: McpOptions,
  ensureClient: () => Promise<StudioClient>,
): Promise<unknown> {
  if (name === "studio_open_project") {
    const root = resolve(String(args["project"] ?? projectRoot));
    if (!existsSync(designMdPath(root))) {
      await initProject({ projectRoot: root });
    }
    const attached = await attachOrSpawn(root, { port: (args["port"] as number | undefined) ?? options.port });
    const client = new StudioClient(attached.url);
    const status = await client.get<{ rev: number; status: string }>("/api/status");
    return { url: attached.url, port: attached.port, spawned: attached.spawned, rev: status.rev, status: status.status };
  }

  if (name === "studio_screenshot") {
    const request: Parameters<typeof screenshot>[0] = {
      widths: args["widths"] as number[],
      outDir: String(args["outDir"]),
      fullPage: args["fullPage"] as boolean | undefined,
    };
    if (args["url"] !== undefined) request.url = String(args["url"]);
    if (args["htmlPath"] !== undefined) request.htmlPath = String(args["htmlPath"]);
    return screenshot(request);
  }

  const client = await ensureClient();

  switch (name) {
    case "studio_status":
      return client.get("/api/status");

    case "studio_wait_for_decision": {
      const cursor = Number(args["cursor"] ?? 0);
      const timeoutSec = Number(args["timeoutSec"] ?? 120);
      return client.get(`/api/wait?cursor=${cursor}&timeoutSec=${timeoutSec}`, (timeoutSec + 15) * 1000);
    }

    case "studio_add_screen":
      return client.post("/api/screens", args);

    case "studio_update_screen":
      return client.post(`/api/screens/${String(args["screenId"])}/revision`, args);

    case "studio_set_decision":
      return client.post(`/api/screens/${String(args["screenId"])}/decision`, {
        state: args["state"],
        notes: args["notes"],
        by: args["by"] ?? "agent",
      });

    case "studio_claim_request":
      return client.post(`/api/requests/${String(args["requestId"])}/claim`, { claimedBy: "agent" });

    case "studio_resolve_request":
      return client.post(`/api/requests/${String(args["requestId"])}/resolve`, {
        state: args["state"],
        result: args["result"],
      });

    case "studio_get_tokens":
      return client.get("/api/tokens");

    case "studio_set_tokens":
      return client.put("/api/tokens", args);

    case "studio_export_handoff":
      return client.post("/api/handoff", { force: args["force"] === true }, 120_000);

    default:
      throw new StudioError("E_NO_STUDIO", `tool ${name} has no dispatch`);
  }
}

function okResult(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const payload =
    error instanceof StudioError
      ? error.toJSON()
      : { code: "E_INTERNAL", message: error instanceof Error ? error.message : String(error) };
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: true };
}
