import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { lintBuildSource } from "../server/lint-build.ts";
import { route, DEFAULT_MAX_ATTEMPTS } from "../server/harness/route.ts";
import { runHarness, toGateReport } from "../server/harness/run.ts";
import type { GateEvidence, GateReport } from "../shared/harness.ts";
import { HARNESS_VERSION } from "../shared/harness.ts";

let root = "";
let components = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ls-harness-"));
  components = join(root, "src", "components");
  await mkdir(components, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const CLEAN = `interface CardProps {
  readonly title: string;
}

export function Card({ title }: CardProps): React.JSX.Element {
  return (
    <section id="card" className="bg-surface text-content">
      <h2>{title}</h2>
      <a href="#card">anchor</a>
    </section>
  );
}
`;

const WITH_LITERAL = CLEAN.replace(
  'className="bg-surface text-content"',
  'style={{ color: "#ff0000" }}',
);

function report(evidence: GateEvidence[], gate = "build-page"): GateReport {
  return {
    harnessVersion: HARNESS_VERSION,
    gate,
    artifact: "http://localhost/",
    at: new Date().toISOString(),
    ok: evidence.every((item) => item.severity !== "blocker" && item.severity !== "error"),
    checks: [],
    evidence,
  };
}

function evidence(rule: string, severity: GateEvidence["severity"], message = "x"): GateEvidence {
  return { rule, failureModes: [], severity, message };
}

describe("the build repair loop", () => {
  it("fails a gate, re-routes with a correction, and passes on the next attempt", async () => {
    const corrections: (string | null)[] = [];

    const result = await runHarness({
      generate: async (attempt, correction) => {
        corrections.push(correction);
        // Attempt 2 only repairs if the route actually told it what was wrong.
        const fixed = attempt > 1 && correction !== null && correction.includes("hex-color-literal");
        await writeFile(join(components, "Card.tsx"), fixed ? CLEAN : WITH_LITERAL, "utf8");
      },
      gate: async () =>
        toGateReport(await lintBuildSource({ projectRoot: root }), {
          gate: "build-source",
          artifact: root,
        }),
    });

    // The state-machine assertion: the verdict decided the next step.
    expect(result.decisions.map((decision) => decision.route.kind)).toEqual(["retry", "advance"]);
    expect(result.attempts).toBe(2);
    expect(result.ok).toBe(true);

    const first = result.decisions[0];
    expect(first?.failureModes).toContain("fm-design-system-drift");
    expect(first?.report.evidence[0]?.file).toContain("Card.tsx");
    expect(first?.report.evidence[0]?.line).toBeGreaterThan(0);

    // The correction carried both the reason and the evidence.
    expect(corrections[0]).toBeNull();
    expect(corrections[1]).toContain("hex-color-literal");
    expect(corrections[1]).toContain("Card.tsx");
  });

  it("escalates to a question instead of looping when the correction does not take", async () => {
    let generated = 0;
    const result = await runHarness({
      maxAttempts: 3,
      generate: async () => {
        generated += 1;
        await writeFile(join(components, "Card.tsx"), WITH_LITERAL, "utf8");
      },
      gate: async () =>
        toGateReport(await lintBuildSource({ projectRoot: root }), {
          gate: "build-source",
          artifact: root,
        }),
    });

    expect(result.decisions.map((decision) => decision.route.kind)).toEqual([
      "retry",
      "ask",
    ]);
    expect(result.ok).toBe(false);
    expect(generated).toBe(2);
    if (result.final.route.kind !== "ask") throw new Error("expected an ask");
    expect(result.final.route.question).toContain("hex-color-literal");
  });
});

describe("the router", () => {
  const run = { attempt: 1, maxAttempts: DEFAULT_MAX_ATTEMPTS, history: [] };

  it("routes a contract gap to the contract skill rather than retrying", () => {
    const decision = route(report([evidence("token-mismatch", "error")]), run);
    expect(decision.route.kind).toBe("load_skill");
    if (decision.route.kind !== "load_skill") throw new Error("expected load_skill");
    expect(decision.route.skill).toBe("ls-design-contract");
    expect(decision.route.because).toContain("contract change");
  });

  it("halts on a blocker rather than averaging it away", () => {
    const decision = route(
      report([evidence("gate-stamp-stale", "blocker"), evidence("hex-color-literal", "error")]),
      run,
    );
    expect(decision.route.kind).toBe("halt");
  });

  it("asks rather than deciding on the person's behalf", () => {
    const decision = route(report([evidence("blank-without-script", "error")]), run);
    expect(decision.route.kind).toBe("ask");
    if (decision.route.kind !== "ask") throw new Error("expected ask");
    expect(decision.route.options).toEqual(["prerender and hydrate", "serve statically"]);
  });

  it("advances with a note when only warnings remain", () => {
    const decision = route(report([evidence("missing-props-interface", "warning")]), run);
    expect(decision.route.kind).toBe("advance");
    if (decision.route.kind !== "advance") throw new Error("expected advance");
    expect(decision.route.note).toContain("missing-props-interface");
  });

  it("asks when the same findings survive a correction", () => {
    const first = report([evidence("hex-color-literal", "error", "same")]);
    const second = report([evidence("hex-color-literal", "error", "same")]);
    const decision = route(second, { attempt: 2, maxAttempts: 3, history: [first] });
    expect(decision.route.kind).toBe("ask");
    if (decision.route.kind !== "ask") throw new Error("expected ask");
    expect(decision.route.question).toContain("did not change the result");
  });

  it("retries when the findings changed, because that is progress", () => {
    const first = report([evidence("hex-color-literal", "error", "one")]);
    const second = report([evidence("dangling-anchor", "error", "two")]);
    const decision = route(second, { attempt: 2, maxAttempts: 3, history: [first] });
    expect(decision.route.kind).toBe("retry");
  });

  it("escalates a load_skill rule ahead of a retryable one, to avoid wasted work", () => {
    const decision = route(
      report([evidence("hex-color-literal", "error"), evidence("token-mismatch", "error")]),
      run,
    );
    expect(decision.route.kind).toBe("load_skill");
  });

  it("reports every failure mode the evidence implicates", () => {
    const decision = route(
      report([evidence("remote-request", "error"), evidence("horizontal-overflow", "error")]),
      run,
    );
    expect(decision.failureModes).toEqual([
      "fm-no-performance-budget",
      "fm-responsive-unverified",
      "fm-unknown-provenance",
    ]);
  });
});
