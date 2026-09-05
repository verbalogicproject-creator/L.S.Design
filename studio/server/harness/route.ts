import { failureModesFor, gateRule } from "../../shared/failure-modes.ts";
import type { FailureModeId } from "../../shared/failure-modes.ts";
import type { GateEvidence, GateReport, HarnessDecision, Route } from "../../shared/harness.ts";

/*
  The router. A pure function from a verdict plus run state to the next move.

  It is separate from every gate on purpose: a gate reports what is true of one
  artifact, while routing needs to know which attempt this is and whether the
  last correction actually took. Keeping the policy here also means the same
  decision table serves gates written in TypeScript and in Python.
*/

export const DEFAULT_MAX_ATTEMPTS = 3;

export interface RunState {
  /** 1-based, the attempt whose report this is. */
  readonly attempt: number;
  readonly maxAttempts: number;
  /** Previous reports, oldest first. */
  readonly history: readonly GateReport[];
}

/**
 * Identity of an unresolved finding across attempts. The line is excluded
 * deliberately: a real fix shifts lines, so including it would make every
 * repair look like progress even when the same defect survived.
 */
function fingerprint(evidence: GateEvidence): string {
  return `${evidence.rule}|${evidence.file ?? ""}|${evidence.message}`;
}

function unresolved(report: GateReport): Set<string> {
  return new Set(
    report.evidence
      .filter((item) => item.severity === "blocker" || item.severity === "error")
      .map(fingerprint),
  );
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const value of left) if (!right.has(value)) return false;
  return true;
}

function describe(evidence: GateEvidence): string {
  const where = evidence.file ? ` ${evidence.file}${evidence.line ? `:${evidence.line}` : ""}` : "";
  const detail =
    evidence.expected !== undefined && evidence.observed !== undefined
      ? ` (expected ${evidence.expected}, got ${evidence.observed})`
      : "";
  return `- ${evidence.rule}${where}: ${evidence.message}${detail}`;
}

/** Assembles the instruction handed back to the generator for the next attempt. */
function buildCorrection(blocking: readonly GateEvidence[]): { correction: string; scope: string[] } {
  const byRule = new Map<string, GateEvidence[]>();
  for (const item of blocking) {
    const bucket = byRule.get(item.rule);
    if (bucket) bucket.push(item);
    else byRule.set(item.rule, [item]);
  }

  const sections: string[] = [];
  for (const [rule, items] of byRule) {
    const instruction = gateRule(rule)?.correction ?? "Resolve the findings below.";
    sections.push([`${rule}: ${instruction}`, ...items.map(describe)].join("\n"));
  }

  const scope = [...new Set(blocking.map((item) => item.file).filter((file): file is string => !!file))];
  return { correction: sections.join("\n\n"), scope: scope.sort() };
}

/**
 * Decides the next move. First match wins, and the order encodes the policy:
 * a blocker is never averaged away, work that belongs to another artifact is
 * escalated rather than retried, a question is never answered on the person's
 * behalf, and a loop that is not converging stops and asks.
 */
export function route(report: GateReport, run: RunState): HarnessDecision {
  const blocking = report.evidence.filter(
    (item) => item.severity === "blocker" || item.severity === "error",
  );
  const failureModes = failureModesFor(report.evidence.map((item) => item.rule)) as FailureModeId[];
  const decide = (next: Route): HarnessDecision => ({
    route: next,
    report,
    failureModes,
    attempt: run.attempt,
    maxAttempts: run.maxAttempts,
  });

  // 1. A blocker halts. "Do not average away a blocker."
  const blocker = report.evidence.find((item) => item.severity === "blocker");
  if (blocker) {
    const because = gateRule(blocker.rule)?.because ?? blocker.message;
    return decide({ kind: "halt", because });
  }

  // 2. Work that belongs to another artifact: retrying this one cannot fix it.
  for (const item of blocking) {
    const rule = gateRule(item.rule);
    if (rule?.route === "load_skill" && rule.skill) {
      return decide({
        kind: "load_skill",
        skill: rule.skill,
        because: rule.because ?? item.message,
      });
    }
  }

  // 3. A question the person owns is never answered here.
  for (const item of blocking) {
    const rule = gateRule(item.rule);
    if (rule?.route === "ask" && rule.question) {
      return decide({
        kind: "ask",
        question: rule.question,
        ...(rule.options ? { options: [...rule.options] } : {}),
      });
    }
  }

  if (blocking.length === 0) {
    const soft = report.evidence.filter(
      (item) => item.severity === "warning" || item.severity === "advisory",
    );
    return decide(
      soft.length > 0
        ? { kind: "advance", note: soft.map(describe).join("\n") }
        : { kind: "advance" },
    );
  }

  // 4. Never loop forever, and never silently give up.
  if (run.attempt >= run.maxAttempts) {
    return decide({
      kind: "ask",
      question:
        `${blocking.length} finding(s) still fail after ${run.attempt} attempts:\n` +
        `${blocking.map(describe).join("\n")}\nHow should this be resolved?`,
    });
  }

  // 5. The correction did not take: the same findings survived it.
  const previous = run.history[run.history.length - 1];
  if (run.attempt >= 2 && previous && sameSet(unresolved(previous), unresolved(report))) {
    return decide({
      kind: "ask",
      question:
        "The previous correction did not change the result. The same findings remain:\n" +
        `${blocking.map(describe).join("\n")}\nHow should this be resolved?`,
    });
  }

  // 6. Otherwise, hand back a concrete correction and try again.
  const { correction, scope } = buildCorrection(blocking);
  return decide({ kind: "retry", correction, scope });
}
