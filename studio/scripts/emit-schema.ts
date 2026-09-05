#!/usr/bin/env node
/**
 * Emits the generated, committed artifacts from their sources of truth:
 *
 *   schema/design.schema.json   <- the zod design state
 *   shared/failure-modes.ts     <- ../failure-modes.json at the repo root
 *
 * The registry is generated rather than read at runtime because the published
 * package ships only `dist`, `templates`, `schema` and the README, so it has no
 * access to a repo-root file. `--check` verifies both are current.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { designStateSchema } from "../shared/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));

interface Emission {
  readonly target: string;
  readonly label: string;
  readonly contents: string;
}

/* ---------------------------------------------------------------- schema */

const jsonSchema = z.toJSONSchema(designStateSchema, { target: "draft-2020-12", io: "output" });
const document = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/verbalogicproject-creator/L.S.Design/studio/schema/design.schema.json",
  title: "L.S.Design studio design.json",
  ...jsonSchema,
};

/* -------------------------------------------------------- failure modes */

const registryPath = resolve(here, "..", "..", "failure-modes.json");
const registry: unknown = JSON.parse(readFileSync(registryPath, "utf8"));

function emitRegistryModule(source: unknown): string {
  return `/*
  GENERATED - do not edit. Source of truth: failure-modes.json at the repo root.
  Regenerate with: npm run schema

  This is generated into the package because the published package ships no
  repo-root file. Both this module and scripts/validate.py read the same JSON,
  so a rule name cannot mean one thing in TypeScript and another in Python.
*/

export const FAILURE_MODE_REGISTRY = ${JSON.stringify(source, null, 2)} as const;

export type FailureModeId = (typeof FAILURE_MODE_REGISTRY)["failure_modes"][number]["id"];
export type GateRuleName = (typeof FAILURE_MODE_REGISTRY)["gate_rules"][number]["rule"];
export type RouteKind = (typeof FAILURE_MODE_REGISTRY)["routes"][number];

/*
  Widened views. The literal union inferred from \`as const\` gives each entry
  only the keys it happens to carry, so a lookup by name cannot ask whether a
  correction exists. These declare the full shape with the route-specific parts
  optional, which is what a consumer holding an unknown rule actually has.
*/
export interface GateRule {
  readonly rule: string;
  readonly gate: string;
  readonly failure_modes: readonly string[];
  readonly severity: string;
  readonly route: RouteKind;
  readonly correction?: string;
  readonly question?: string;
  readonly options?: readonly string[];
  readonly skill?: string;
  readonly because?: string;
}

export interface FailureMode {
  readonly id: string;
  readonly title: string;
  readonly rule_class: string;
  readonly cause: string;
  readonly symptom: string;
  readonly fix: string;
  readonly origin?: string;
  readonly invariant?: string;
  readonly source?: string;
}

const RULES_BY_NAME = new Map<string, GateRule>(
  FAILURE_MODE_REGISTRY.gate_rules.map((rule) => [rule.rule, rule]),
);

const MODES_BY_ID = new Map<string, FailureMode>(
  FAILURE_MODE_REGISTRY.failure_modes.map((mode) => [mode.id, mode]),
);

/** The binding for a rule a gate emitted, or undefined if the rule is unregistered. */
export function gateRule(name: string): GateRule | undefined {
  return RULES_BY_NAME.get(name);
}

export function failureMode(id: string): FailureMode | undefined {
  return MODES_BY_ID.get(id);
}

/** Every failure mode a set of rule names implicates, deduped and stable. */
export function failureModesFor(rules: readonly string[]): string[] {
  const found = new Set<string>();
  for (const name of rules) {
    for (const id of RULES_BY_NAME.get(name)?.failure_modes ?? []) found.add(id);
  }
  return [...found].sort();
}
`;
}

/* ------------------------------------------------------------- emission */

const emissions: Emission[] = [
  {
    target: resolve(here, "..", "schema", "design.schema.json"),
    label: "schema/design.schema.json",
    contents: `${JSON.stringify(document, null, 2)}\n`,
  },
  {
    target: resolve(here, "..", "shared", "failure-modes.ts"),
    label: "shared/failure-modes.ts",
    contents: emitRegistryModule(registry),
  },
];

if (process.argv.includes("--check")) {
  let stale = false;
  for (const emission of emissions) {
    let current = "";
    try {
      current = readFileSync(emission.target, "utf8");
    } catch {
      console.error(`${emission.label} is missing; run: npm run schema`);
      stale = true;
      continue;
    }
    if (current !== emission.contents) {
      console.error(`${emission.label} is stale; run: npm run schema`);
      stale = true;
    }
  }
  if (stale) process.exit(1);
  console.log("generated files are current");
} else {
  for (const emission of emissions) {
    mkdirSync(dirname(emission.target), { recursive: true });
    writeFileSync(emission.target, emission.contents, "utf8");
    console.log(`wrote ${emission.target}`);
  }
}
