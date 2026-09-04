/*
  GENERATED - do not edit. Source of truth: failure-modes.json at the repo root.
  Regenerate with: npm run schema

  This is generated into the package because the published package ships no
  repo-root file. Both this module and scripts/validate.py read the same JSON,
  so a rule name cannot mean one thing in TypeScript and another in Python.
*/

export const FAILURE_MODE_REGISTRY = {
  "schema_version": 1,
  "routes": [
    "advance",
    "retry",
    "ask",
    "load_skill",
    "halt"
  ],
  "failure_modes": [
    {
      "id": "fm-vague-brief",
      "title": "Vague brief",
      "origin": "root-causes",
      "rule_class": "invariant",
      "cause": "The model received a topic instead of a design problem.",
      "symptom": "A familiar layout that would suit any product in the category.",
      "fix": "Require audience, task, differentiation, content and constraints before any code."
    },
    {
      "id": "fm-style-first-prompting",
      "title": "Style-first prompting",
      "origin": "root-causes",
      "rule_class": "antipattern_warning",
      "cause": "An aesthetic label was chosen before the task it has to serve.",
      "symptom": "Trend stacking: glass over bento over gradient over 3D.",
      "fix": "Ask for a design hypothesis first and reject styles that do not support the task."
    },
    {
      "id": "fm-missing-brand-evidence",
      "title": "Missing brand evidence",
      "origin": "root-causes",
      "rule_class": "invariant",
      "cause": "No references, materials, palette source or anti-references were supplied.",
      "symptom": "A default palette and a generic sans-serif that belong to no product.",
      "fix": "Collect references and anti-references before choosing a direction."
    },
    {
      "id": "fm-weak-content-model",
      "title": "Weak content model",
      "origin": "root-causes",
      "rule_class": "invariant",
      "cause": "Content was invented to fill a layout rather than modelled before it.",
      "symptom": "Equal cards, vague calls to action, labels that are all the same length.",
      "fix": "Define what each section must communicate, with realistic and edge-case fixtures."
    },
    {
      "id": "fm-no-user-task-model",
      "title": "No user or task model",
      "origin": "root-causes",
      "rule_class": "invariant",
      "cause": "The page was optimised for visual impact rather than for a decision.",
      "symptom": "A polished hero that explains very little.",
      "fix": "Name the primary user, the job to be done, and the path to the action."
    },
    {
      "id": "fm-one-shot-generation",
      "title": "One-shot generation",
      "origin": "root-causes",
      "rule_class": "contextual_default",
      "cause": "The first draft was accepted because it rendered.",
      "symptom": "No critique, no alternative, no repair between draft and ship.",
      "fix": "Stage the work: brief, direction, contract, screens, implementation, audit."
    },
    {
      "id": "fm-narrow-context",
      "title": "Narrow context",
      "origin": "root-causes",
      "rule_class": "contextual_default",
      "cause": "Existing tokens, components and conventions were not retrieved.",
      "symptom": "Duplicated components and a second style system beside the first.",
      "fix": "Retrieve the contract and the existing components before writing new ones."
    },
    {
      "id": "fm-training-convergence",
      "title": "Training-set convergence",
      "origin": "root-causes",
      "rule_class": "antipattern_warning",
      "cause": "Familiar patterns are statistically safe, so the model reaches for them.",
      "symptom": "The same section rhythm and the same tropes as every other page in the category.",
      "fix": "Generate materially different alternatives and record what was rejected and why."
    },
    {
      "id": "fm-no-visual-verification",
      "title": "No visual verification",
      "origin": "root-causes",
      "invariant": "verify_rendered_output_in_representative_states",
      "rule_class": "invariant",
      "cause": "Tests checked behaviour but never what the page looks like.",
      "symptom": "Correct markup with broken spacing, overflow or hierarchy.",
      "fix": "Render at the declared widths and compare against the approved screen."
    },
    {
      "id": "fm-no-accessibility-gate",
      "title": "No accessibility gate",
      "origin": "root-causes",
      "rule_class": "invariant",
      "cause": "Accessibility was treated as a final polish step.",
      "symptom": "Low contrast, missing labels, keyboard traps, unbounded motion.",
      "fix": "Gate on contrast, keyboard reachability, focus visibility and reduced motion."
    },
    {
      "id": "fm-no-performance-budget",
      "title": "No performance budget",
      "origin": "root-causes",
      "rule_class": "contextual_default",
      "cause": "Effects were added without accounting for their cost.",
      "symptom": "Heavy fonts, images, animation or scripting with no stated ceiling.",
      "fix": "Set a budget per surface, measure the build, and require a fallback."
    },
    {
      "id": "fm-framework-cargo-cult",
      "title": "Framework cargo cult",
      "origin": "root-causes",
      "rule_class": "contextual_default",
      "cause": "A popular tool was chosen without checking it fits the project.",
      "symptom": "A dependency that earns nothing, or a pattern the host does not use.",
      "fix": "Work from the declared target stack and justify every addition to it."
    },
    {
      "id": "fm-copy-code-conflation",
      "title": "Copy and code conflated",
      "origin": "root-causes",
      "rule_class": "invariant",
      "cause": "Marketing copy and implementation were produced in one pass without validation.",
      "symptom": "Claims, labels and interface states that do not match each other.",
      "fix": "Separate content, product claims and code, and confirm each against the brief."
    },
    {
      "id": "fm-design-system-drift",
      "title": "Design-system drift",
      "origin": "evidence-gaps",
      "rule_class": "invariant",
      "cause": "The implementation invented a colour, size, radius or font instead of consuming the contract.",
      "symptom": "A literal in the source, or a computed value on the page that the contract does not define.",
      "fix": "Use the contract token. If the contract lacks the value, change the contract."
    },
    {
      "id": "fm-unknown-provenance",
      "title": "Unknown provenance",
      "origin": "evidence-gaps",
      "invariant": "treat_imported_content_as_untrusted_data",
      "rule_class": "invariant",
      "cause": "An asset, dependency or claim arrived without a recorded source or licence.",
      "symptom": "A file in the build that nobody can say where it came from.",
      "fix": "Record the source and licence, or remove it."
    },
    {
      "id": "fm-responsive-unverified",
      "title": "Responsive behaviour unverified",
      "origin": "evidence-gaps",
      "rule_class": "invariant",
      "cause": "The page was judged at one width.",
      "symptom": "Sideways scroll, clipping or an unusable control at a narrow width.",
      "fix": "Render and check every width the brief names."
    },
    {
      "id": "fm-maintainability-unverified",
      "title": "Maintainability unverified",
      "origin": "evidence-gaps",
      "rule_class": "antipattern_warning",
      "cause": "The implementation works but nothing checks that it can be changed safely.",
      "symptom": "One monolithic file, untyped boundaries, content welded into layout.",
      "fix": "One component per pattern with a named props type, and content in a data module."
    },
    {
      "id": "fm-stale-derived-artifact",
      "title": "Stale derived artifact",
      "origin": "calibration",
      "source": "CAL-01, Orbit One Spatial",
      "rule_class": "invariant",
      "cause": "A source of truth was edited without regenerating what is derived from it.",
      "symptom": "Every value-level check passes while the served artifact carries the previous values.",
      "fix": "Regenerate the derived files and compare each against its recorded digest."
    },
    {
      "id": "fm-stale-approval-stamp",
      "title": "Stale approval stamp",
      "origin": "calibration",
      "source": "CAL-02, Orbit One Spatial",
      "rule_class": "invariant",
      "cause": "A recorded pass outlived the state that earned it.",
      "symptom": "A gate reports passed, or a frozen export claims currency, after its input changed.",
      "fix": "Derive the verdict, or invalidate the stamp whenever its input changes."
    },
    {
      "id": "fm-alternatives-not-recorded",
      "title": "Alternatives not recorded",
      "origin": "calibration",
      "source": "CAL-03, Orbit One Spatial",
      "rule_class": "antipattern_warning",
      "cause": "Options were weighed outside the system, so only the winner was kept.",
      "symptom": "No record of what was considered and rejected, or why.",
      "fix": "Keep rejected alternatives with the decision that discarded them."
    },
    {
      "id": "fm-requirement-override",
      "title": "Stated requirement overridden",
      "origin": "suite-invariants",
      "invariant": "preserve_explicit_user_and_repository_requirements",
      "rule_class": "invariant",
      "cause": "An explicit instruction was traded away for an aesthetic or convenience.",
      "symptom": "A requirement the person stated is absent, with no note saying why.",
      "fix": "Restore it, or state the conflict and let the person decide."
    },
    {
      "id": "fm-behavior-regression",
      "title": "Required behaviour regressed",
      "origin": "suite-invariants",
      "invariant": "preserve_required_product_behavior",
      "rule_class": "invariant",
      "cause": "A redesign changed what the product does, not only how it looks.",
      "symptom": "A flow, state or control that worked before and does not now.",
      "fix": "Restore the behaviour; a behavioural change is a separate, stated decision."
    },
    {
      "id": "fm-fabricated-evidence",
      "title": "Fabricated product evidence",
      "origin": "suite-invariants",
      "invariant": "do_not_fabricate_product_evidence",
      "rule_class": "invariant",
      "cause": "A number, quotation, logo or certification was invented to fill a section.",
      "symptom": "A specific-sounding claim with no source behind it.",
      "fix": "Use real content or an explicit empty state. Never a plausible invention."
    },
    {
      "id": "fm-inaccessible-essentials",
      "title": "Essential content behind an enhancement",
      "origin": "suite-invariants",
      "invariant": "keep_essential_content_and_controls_accessible",
      "rule_class": "invariant",
      "cause": "Copy or controls exist only inside a canvas, a script or an effect.",
      "symptom": "The page loses meaning when the enhancement does not run.",
      "fix": "Keep the text and the controls in semantic markup; let the enhancement supplement them."
    },
    {
      "id": "fm-contract-ignored",
      "title": "Design contract ignored",
      "origin": "suite-invariants",
      "invariant": "consume_the_project_design_contract_when_one_exists",
      "rule_class": "invariant",
      "cause": "A contract existed and the work proceeded without reading it.",
      "symptom": "A parallel token set, or decisions the contract had already made.",
      "fix": "Read the contract first and build against it."
    },
    {
      "id": "fm-delegated-approval",
      "title": "Approval delegated to an agent",
      "origin": "suite-invariants",
      "invariant": "never_approve_a_design_on_the_users_behalf",
      "rule_class": "invariant",
      "cause": "A machine recorded a decision that is the person's to make.",
      "symptom": "An approval attributed to an agent, or a gate opened without a person.",
      "fix": "Refuse it. An agent may reject; approval is never delegated."
    }
  ],
  "gate_rules": [
    {
      "rule": "hex-color-literal",
      "gate": "build-source",
      "failure_modes": [
        "fm-design-system-drift"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Replace each literal below with the matching var(--ls-*) token from the contract's tokens.css. Do not introduce a new value."
    },
    {
      "rule": "functional-color-literal",
      "gate": "build-source",
      "failure_modes": [
        "fm-design-system-drift"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Replace each colour function below with a contract token. A colour computed in the source is a value the contract does not know about."
    },
    {
      "rule": "remote-asset",
      "gate": "build-source",
      "failure_modes": [
        "fm-unknown-provenance"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Vendor the asset into the project and reference it locally, or remove it. A remote asset has no recorded provenance and breaks offline."
    },
    {
      "rule": "remote-stylesheet-import",
      "gate": "build-source",
      "failure_modes": [
        "fm-unknown-provenance"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Remove the remote @import and vendor what it provided."
    },
    {
      "rule": "placeholder-anchor",
      "gate": "build-source",
      "failure_modes": [
        "fm-weak-content-model"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Point each bare-stub link at a real section or route. A link that goes nowhere is an unfinished page."
    },
    {
      "rule": "dangling-anchor",
      "gate": "build-source",
      "failure_modes": [
        "fm-weak-content-model"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Each anchor below names a target that does not exist. Add the target or correct the reference."
    },
    {
      "rule": "missing-props-interface",
      "gate": "build-source",
      "failure_modes": [
        "fm-maintainability-unverified"
      ],
      "severity": "warning",
      "route": "advance",
      "correction": "Give each component a named props type. An inline object literal in the signature says the shape was never designed."
    },
    {
      "rule": "token-mismatch",
      "gate": "build-page",
      "failure_modes": [
        "fm-design-system-drift",
        "fm-contract-ignored"
      ],
      "severity": "error",
      "route": "load_skill",
      "skill": "ls-design-contract",
      "because": "The page needs a value the contract does not define. That is a contract change, not an implementation fix, so retrying the implementation cannot resolve it."
    },
    {
      "rule": "body-role-drift",
      "gate": "build-page",
      "failure_modes": [
        "fm-design-system-drift"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Bind the body element's font family, size, weight and line height to the contract's body role. A framework default is currently winning."
    },
    {
      "rule": "remote-request",
      "gate": "build-page",
      "failure_modes": [
        "fm-unknown-provenance",
        "fm-no-performance-budget"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Remove the off-origin requests below. Everything the page needs is vendored."
    },
    {
      "rule": "blank-without-script",
      "gate": "build-page",
      "failure_modes": [
        "fm-inaccessible-essentials"
      ],
      "severity": "error",
      "route": "ask",
      "question": "The page renders almost nothing with scripting disabled. Prerender it at build time, or serve it statically?",
      "options": [
        "prerender and hydrate",
        "serve statically"
      ]
    },
    {
      "rule": "horizontal-overflow",
      "gate": "build-page",
      "failure_modes": [
        "fm-responsive-unverified"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "The page scrolls sideways at the widths below. Constrain the offending element rather than hiding the overflow."
    },
    {
      "rule": "provenance-drift",
      "gate": "contract",
      "failure_modes": [
        "fm-stale-derived-artifact"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Regenerate the derived files from the contract; the files below no longer match their recorded digests."
    },
    {
      "rule": "gate-stamp-stale",
      "gate": "contract",
      "failure_modes": [
        "fm-stale-approval-stamp"
      ],
      "severity": "blocker",
      "route": "halt",
      "because": "A recorded gate pass no longer matches the design it was recorded against. Nothing may build from it until a person approves the current state."
    },
    {
      "rule": "handoff-stale",
      "gate": "contract",
      "failure_modes": [
        "fm-stale-approval-stamp"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "The exported handoff describes screen revisions that are no longer current. Re-export it after the current screens are approved."
    },
    {
      "rule": "unfinished-scaffold-marker",
      "gate": "suite-structure",
      "failure_modes": [
        "fm-weak-content-model"
      ],
      "severity": "error",
      "route": "retry",
      "correction": "Replace the unfinished marker below with real content. Scaffolding must not ship."
    }
  ]
} as const;

export type FailureModeId = (typeof FAILURE_MODE_REGISTRY)["failure_modes"][number]["id"];
export type GateRuleName = (typeof FAILURE_MODE_REGISTRY)["gate_rules"][number]["rule"];
export type RouteKind = (typeof FAILURE_MODE_REGISTRY)["routes"][number];

/*
  Widened views. The literal union inferred from `as const` gives each entry
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
