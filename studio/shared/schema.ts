import { z } from "zod";

export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ errors */

export const ERROR_CODES = [
  "E_NO_STUDIO",
  "E_REV_CONFLICT",
  "E_SCREEN_NOT_FOUND",
  "E_REQUEST_NOT_FOUND",
  "E_INVALID_FILE",
  "E_TOKENS_INVALID",
  "E_GATE_BLOCKED",
  "E_PROJECT_LOCKED",
  "E_NO_CHROMIUM",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class StudioError extends Error {
  readonly code: ErrorCode;
  readonly detail: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = "StudioError";
    this.code = code;
    this.detail = detail;
  }

  toJSON(): { code: ErrorCode; message: string; detail?: Record<string, unknown> } {
    return this.detail === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, detail: this.detail };
  }
}

export const errorStatus: Record<ErrorCode, number> = {
  E_NO_STUDIO: 503,
  E_REV_CONFLICT: 409,
  E_SCREEN_NOT_FOUND: 404,
  E_REQUEST_NOT_FOUND: 404,
  E_INVALID_FILE: 422,
  E_TOKENS_INVALID: 422,
  E_GATE_BLOCKED: 409,
  E_PROJECT_LOCKED: 423,
  E_NO_CHROMIUM: 501,
};

/* ------------------------------------------------------------- design.json */

export const idPattern = /^(scr|req)_[0-9a-f]{8}$/;
const screenId = z.string().regex(/^scr_[0-9a-f]{8}$/, "expected a screen id");
const requestId = z.string().regex(/^req_[0-9a-f]{8}$/, "expected a request id");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "expected a slug");
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, "expected a sha256 digest");
const isoDate = z.iso.datetime();

export const deviceSchema = z.enum(["desktop", "tablet", "mobile"]);
export const decisionStateSchema = z.enum(["pending", "approved", "rejected"]);
export const requestStateSchema = z.enum(["pending", "claimed", "done", "failed", "cancelled"]);
export const requestTypeSchema = z.enum([
  "regenerate",
  "variants",
  "edit_with_prompt",
  "add_screen",
  "reapply_design_system",
]);
export const projectStatusSchema = z.enum(["draft", "direction", "screens", "approved", "built"]);
export const sourceKindSchema = z.enum(["stitch", "agent", "import"]);

export const screenSourceSchema = z.object({
  kind: sourceKindSchema,
  projectId: z.string().optional(),
  screenId: z.string().optional(),
  instanceId: z.string().optional(),
  sourceScreen: z.string().optional(),
  prompt: z.string().optional(),
  refPath: z.string().optional(),
});

export const screenSchema = z.object({
  id: screenId,
  slug,
  title: z.string().min(1),
  device: deviceSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  source: screenSourceSchema,
  revision: z.number().int().positive(),
  parentId: screenId.optional(),
  files: z.object({
    html: z.string(),
    png: z.string(),
    sha256: z.object({ html: sha256Hex, png: sha256Hex }),
  }),
  decision: z.object({
    state: decisionStateSchema,
    notes: z.string().default(""),
    at: isoDate.optional(),
    by: z.enum(["human", "agent"]).optional(),
  }),
  /**
   * A token-driven screen links the project's own tokens.css and uses only
   * var(--ls-*) for colour, type, radius and spacing. Its appearance is derived
   * rather than captured, so a token edit repaints it and it never goes stale.
   * Screens imported from an external generator are baked and stay false.
   */
  tokenDriven: z.boolean().default(false),
  staleTokens: z.boolean().default(false),
  /**
   * The tokensHash this revision was captured under. Staleness is derived from
   * it, so editing a token and editing it back clears staleness by itself
   * instead of stranding every screen as permanently out of date.
   */
  capturedTokensHash: sha256Hex.optional(),
  canvas: z.object({ x: z.number(), y: z.number() }),
});

export const requestSchema = z.object({
  id: requestId,
  type: requestTypeSchema,
  screenId: screenId.optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  state: requestStateSchema,
  createdAt: isoDate,
  claimedBy: z.string().optional(),
  resolvedAt: isoDate.optional(),
  result: z.record(z.string(), z.unknown()).optional(),
});

export const eventSchema = z.object({
  seq: z.number().int().nonnegative(),
  at: isoDate,
  type: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const contrastPairSchema = z.object({
  foreground: z.string(),
  background: z.string(),
  target: z.number().positive(),
});

export const approvalSchema = z.object({
  at: isoDate,
  screenId: screenId.optional(),
  state: decisionStateSchema,
  notes: z.string().default(""),
  by: z.enum(["human", "agent"]),
  revision: z.number().int().positive().optional(),
});

export const designStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  rev: z.number().int().positive(),
  seq: z.number().int().nonnegative(),
  project: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    root: z.string().min(1),
    lang: z.string().min(2),
    dir: z.enum(["ltr", "rtl"]),
    createdAt: isoDate,
  }),
  status: projectStatusSchema,
  tokensHash: z.string(),
  contrastPairs: z.array(contrastPairSchema).default([]),
  generator: z.object({
    kind: sourceKindSchema,
    stitch: z.object({ projectId: z.string(), designSystemId: z.string().optional() }).optional(),
  }),
  screens: z.array(screenSchema).default([]),
  requests: z.array(requestSchema).default([]),
  events: z.array(eventSchema).default([]),
  gates: z.object({
    screens: z.object({
      passed: z.boolean(),
      at: isoDate.optional(),
      handoffSha256: sha256Hex.optional(),
    }),
  }),
  approvals: z.array(approvalSchema).default([]),
  provenance: z.record(z.string(), z.string()).default({}),
});

export type DesignState = z.infer<typeof designStateSchema>;
export type Screen = z.infer<typeof screenSchema>;
export type ScreenSource = z.infer<typeof screenSourceSchema>;
export type StudioRequest = z.infer<typeof requestSchema>;
export type StudioEvent = z.infer<typeof eventSchema>;
export type ContrastPair = z.infer<typeof contrastPairSchema>;
export type RequestType = z.infer<typeof requestTypeSchema>;
export type Device = z.infer<typeof deviceSchema>;

export const EVENT_RING_SIZE = 500;

/* ------------------------------------------------------------------ gates */

export const gateSchema = z.object({
  passed: z.boolean(),
  canPass: z.boolean(),
  pending: z.array(screenId),
  rejected: z.array(screenId),
  stale: z.array(screenId),
  pendingReapply: z.number().int().nonnegative(),
  at: isoDate.optional(),
  handoffSha256: sha256Hex.optional(),
});

export type Gate = z.infer<typeof gateSchema>;

/* ------------------------------------------------------------- MCP tool IO */

const fileInput = {
  htmlPath: z.string().optional(),
  htmlBase64: z.string().optional(),
  pngPath: z.string().optional(),
  pngBase64: z.string().optional(),
};

export const toolInput = {
  studio_open_project: z.object({
    project: z.string().min(1),
    port: z.number().int().min(1).max(65535).optional(),
    open: z.boolean().optional(),
  }),
  studio_status: z.object({}),
  studio_wait_for_decision: z.object({
    cursor: z.number().int().nonnegative().default(0),
    timeoutSec: z.number().int().min(1).max(300).default(120),
  }),
  studio_add_screen: z.object({
    title: z.string().min(1),
    device: deviceSchema.default("desktop"),
    width: z.number().int().positive().default(1440),
    height: z.number().int().positive().default(1024),
    source: screenSourceSchema,
    tokenDriven: z.boolean().default(false),
    parentId: screenId.optional(),
    canvas: z.object({ x: z.number(), y: z.number() }).optional(),
    ...fileInput,
  }),
  studio_update_screen: z.object({
    screenId,
    title: z.string().min(1).optional(),
    source: screenSourceSchema.optional(),
    /* A revision may convert a baked screen to a token-driven one, or back. */
    tokenDriven: z.boolean().optional(),
    /* A redesigned screen is rarely the same height as the one it replaces. */
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    ifRev: z.number().int().positive().optional(),
    ...fileInput,
  }),
  studio_set_decision: z.object({
    screenId,
    state: decisionStateSchema,
    notes: z.string().optional(),
    by: z.enum(["human", "agent"]).default("agent"),
  }),
  studio_claim_request: z.object({ requestId }),
  studio_resolve_request: z.object({
    requestId,
    state: z.enum(["done", "failed"]),
    result: z.record(z.string(), z.unknown()).optional(),
  }),
  studio_get_tokens: z.object({}),
  studio_set_tokens: z.object({
    tokens: z.record(z.string(), z.unknown()),
    ifRev: z.number().int().positive().optional(),
    queueReapply: z.boolean().default(true),
  }),
  studio_export_handoff: z.object({ force: z.boolean().default(false) }),
  studio_screenshot: z.object({
    url: z.string().optional(),
    htmlPath: z.string().optional(),
    widths: z.array(z.number().int().min(200).max(4000)).default([360, 768, 1440]),
    outDir: z.string().min(1),
    fullPage: z.boolean().default(true),
  }),
} as const;

export type ToolName = keyof typeof toolInput;
export const TOOL_NAMES = Object.keys(toolInput) as ToolName[];
