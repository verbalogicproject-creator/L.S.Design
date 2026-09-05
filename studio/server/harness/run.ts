import { failureModesFor, gateRule } from "../../shared/failure-modes.ts";
import type { GateEvidence, GateReport, HarnessDecision } from "../../shared/harness.ts";
import { HARNESS_VERSION } from "../../shared/harness.ts";
import type { LintBuildResult } from "../lint-build.ts";
import { DEFAULT_MAX_ATTEMPTS, route, type RunState } from "./route.ts";

/*
  The loop: generate, gate, route. On `retry` it goes round again carrying the
  correction; on anything else it stops and returns the decision.

  It never answers its own question and never loads a skill itself — it returns
  the route for the agent to perform. That is the machine counterpart of the
  rule that an agent may reject but never approve: the harness decides what is
  true, and hands the consequence to whoever owns it.
*/

export interface HarnessRunOptions {
  /** Judges the current artifact. Pure with respect to the harness. */
  readonly gate: () => Promise<GateReport>;
  /** Produces or repairs the artifact. `correction` is null on the first attempt. */
  readonly generate: (attempt: number, correction: string | null) => Promise<void>;
  readonly maxAttempts?: number;
  /** Optional sink. Absent when the project has no studio; the loop still runs. */
  readonly record?: (decision: HarnessDecision) => Promise<void>;
}

export interface HarnessRunResult {
  readonly ok: boolean;
  readonly attempts: number;
  readonly decisions: readonly HarnessDecision[];
  readonly final: HarnessDecision;
}

export async function runHarness(options: HarnessRunOptions): Promise<HarnessRunResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const decisions: HarnessDecision[] = [];
  const history: GateReport[] = [];
  let correction: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await options.generate(attempt, correction);
    const report = await options.gate();
    const state: RunState = { attempt, maxAttempts, history: [...history] };
    const decision = route(report, state);

    decisions.push(decision);
    history.push(report);
    if (options.record) await options.record(decision);

    if (decision.route.kind !== "retry") {
      return {
        ok: decision.route.kind === "advance",
        attempts: attempt,
        decisions,
        final: decision,
      };
    }
    correction = decision.route.correction;
  }

  // Unreachable in practice: the router converts the final attempt into `ask`.
  const final = decisions[decisions.length - 1];
  if (!final) throw new Error("harness ran no attempts");
  return { ok: false, attempts: decisions.length, decisions, final };
}

/** Severity for a rule the registry knows, falling back to the gate's own word. */
function severityOf(rule: string, fallback: "error" | "warning"): GateEvidence["severity"] {
  const registered = gateRule(rule)?.severity;
  if (registered === "blocker" || registered === "error" || registered === "warning" || registered === "advisory") {
    return registered;
  }
  return fallback;
}

/**
 * Adapts a lint result into the shape the router reads. The lint keeps its own
 * output format unchanged so the existing `lint-build` command and its tests are
 * untouched; this is purely additive.
 */
export function toGateReport(
  result: LintBuildResult,
  context: { readonly gate: string; readonly artifact: string; readonly at?: string },
): GateReport {
  const evidence: GateEvidence[] = result.findings.map((finding) => ({
    rule: finding.rule,
    failureModes: failureModesFor([finding.rule]) as GateEvidence["failureModes"],
    severity: severityOf(finding.rule, finding.severity),
    message: finding.message,
    ...(finding.file !== undefined ? { file: finding.file } : {}),
    ...(finding.line !== undefined ? { line: finding.line } : {}),
  }));

  return {
    harnessVersion: HARNESS_VERSION,
    gate: context.gate,
    artifact: context.artifact,
    at: context.at ?? new Date().toISOString(),
    ok: evidence.every((item) => item.severity !== "blocker" && item.severity !== "error"),
    checks: result.checks.map((check) => ({
      name: check.name,
      status: check.status,
      detail: check.detail,
    })),
    evidence,
  };
}
