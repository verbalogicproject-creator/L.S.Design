import { z } from "zod";

import type { FailureModeId, RouteKind } from "./failure-modes.ts";

/*
  The harness is the reason/logic pair: the agent supplies reason by producing an
  artifact, a gate supplies logic by judging it, and a router turns the verdict
  into the next move. The two halves are kept apart deliberately.

  A gate reports only what is true of the artifact. It never names a route,
  because routing depends on state a gate cannot see — which attempt this is, and
  whether a finding survived the previous correction — and because the same
  verdict should be able to route differently in CI than in a session. Keeping
  the policy in one router is also the only way two gates written in two
  languages can agree.
*/

export const HARNESS_VERSION = 1;

/** Bounded so machine-speed runs cannot grow the design document without limit. */
export const HARNESS_RING_SIZE = 100;

export const gateSeverities = ["blocker", "error", "warning", "advisory"] as const;
export type GateSeverity = (typeof gateSeverities)[number];

/** One deterministic observation. A gate produces these and nothing else. */
export interface GateEvidence {
  readonly rule: string;
  readonly failureModes: readonly FailureModeId[];
  readonly severity: GateSeverity;
  readonly message: string;
  readonly file?: string | undefined;
  readonly line?: number | undefined;
  readonly expected?: string | undefined;
  readonly observed?: string | undefined;
}

export interface GateCheck {
  readonly name: string;
  readonly status: "pass" | "fail" | "warn" | "skipped";
  readonly detail: string;
}

/** What a gate returns. Carries no route. */
export interface GateReport {
  readonly harnessVersion: number;
  readonly gate: string;
  readonly artifact: string;
  readonly at: string;
  readonly ok: boolean;
  readonly checks: readonly GateCheck[];
  readonly evidence: readonly GateEvidence[];
}

/** What the router returns. The only thing that names a next move. */
export type Route =
  | { readonly kind: "advance"; readonly note?: string }
  | { readonly kind: "retry"; readonly correction: string; readonly scope: readonly string[] }
  | { readonly kind: "ask"; readonly question: string; readonly options?: readonly string[] }
  | { readonly kind: "load_skill"; readonly skill: string; readonly because: string }
  | { readonly kind: "halt"; readonly because: string };

export interface HarnessDecision {
  readonly route: Route;
  readonly report: GateReport;
  readonly failureModes: readonly FailureModeId[];
  readonly attempt: number;
  readonly maxAttempts: number;
}

/* ------------------------------------------------------------------ zod */

export const gateCheckSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["pass", "fail", "warn", "skipped"]),
  detail: z.string(),
});

export const gateEvidenceSchema = z.object({
  rule: z.string().min(1),
  failureModes: z.array(z.string()).default([]),
  severity: z.enum(gateSeverities),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  expected: z.string().optional(),
  observed: z.string().optional(),
});

export const gateReportSchema = z.object({
  harnessVersion: z.literal(HARNESS_VERSION),
  gate: z.string().min(1),
  artifact: z.string(),
  at: z.string(),
  ok: z.boolean(),
  checks: z.array(gateCheckSchema).default([]),
  evidence: z.array(gateEvidenceSchema).default([]),
});

export const routeSchema: z.ZodType<Route> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("advance"), note: z.string().optional() }),
  z.object({
    kind: z.literal("retry"),
    correction: z.string().min(1),
    scope: z.array(z.string()).default([]),
  }),
  z.object({
    kind: z.literal("ask"),
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal("load_skill"),
    skill: z.string().min(1),
    because: z.string().min(1),
  }),
  z.object({ kind: z.literal("halt"), because: z.string().min(1) }),
]);

/** The bounded index entry kept in design.json; the full report lives beside it. */
export const harnessRunSchema = z.object({
  id: z.string().regex(/^run_[0-9a-f]{8}$/),
  gate: z.string().min(1),
  artifact: z.string(),
  at: z.string(),
  attempt: z.number().int().positive(),
  ok: z.boolean(),
  route: z.enum(["advance", "retry", "ask", "load_skill", "halt"]),
  failureModes: z.array(z.string()).default([]),
  evidenceCount: z.number().int().nonnegative(),
  reportPath: z.string(),
  reportSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type HarnessRun = z.infer<typeof harnessRunSchema>;

/** Exit codes let a shell or an agent branch on the state machine without parsing JSON. */
export const routeExitCode: Record<RouteKind, number> = {
  advance: 0,
  retry: 10,
  ask: 11,
  load_skill: 12,
  halt: 13,
};
