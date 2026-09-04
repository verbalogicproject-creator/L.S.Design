from __future__ import annotations

import importlib.util
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def load_validator():
    path = ROOT / "scripts" / "validate.py"
    spec = importlib.util.spec_from_file_location("ls_design_validator", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ValidationTests(unittest.TestCase):
    def test_suite_contract(self):
        validator = load_validator()
        self.assertEqual(validator.validate(), [])

    def test_shared_references_cover_every_public_skill(self):
        rules = json.loads((ROOT / "suite-rules.json").read_text(encoding="utf-8"))
        skill_names = {
            path.name for path in (ROOT / "skills").iterdir() if path.is_dir()
        }
        references = rules["shared_references"]
        self.assertEqual(
            set(references),
            {
                "core_principles",
                "natural_color_and_humanization",
                "advanced_layout",
                "design_contract",
                "rtl_foundations",
                "interface_copy",
            },
        )
        for contract in references.values():
            self.assertEqual(set(contract["consumers"]), skill_names)
            self.assertTrue((ROOT / contract["path"]).is_file(), contract["path"])

    def test_no_markdown_link_escapes_the_skills_tree(self):
        """The installer copies skills/ alone, so a link above it dangles once installed."""
        skills = ROOT / "skills"
        escaping = []
        for markdown in skills.rglob("*.md"):
            text = markdown.read_text(encoding="utf-8")
            for match in re.finditer(r"\[[^\]]+\]\((?!https?://|mailto:|tel:|#)([^)]+)\)", text):
                target = match.group(1).split("#", 1)[0]
                if not target:
                    continue
                resolved = (markdown.parent / target).resolve()
                if not resolved.is_relative_to(skills.resolve()):
                    escaping.append(f"{markdown.relative_to(ROOT)} -> {target}")
        self.assertEqual(escaping, [])

    def test_validator_reports_a_link_that_escapes_the_skills_tree(self):
        validator = load_validator()
        scorecard = ROOT / "skills" / "ls-design-review" / "references" / "review-scorecard.md"
        original = scorecard.read_text(encoding="utf-8")
        try:
            scorecard.write_text(
                original + "\nSee [comparison test](../../../docs/COMPARISON_TEST.md).\n",
                encoding="utf-8",
            )
            errors = validator.validate()
            self.assertTrue(
                any("escapes the skills tree" in error for error in errors),
                errors,
            )
        finally:
            scorecard.write_text(original, encoding="utf-8")

    def test_documentation_only_keys_are_declared(self):
        rules = json.loads((ROOT / "suite-rules.json").read_text(encoding="utf-8"))
        consumed = {
            "skill_count",
            "frontmatter_keys",
            "shared_references",
            "documentation_only",
            "rule_classes",
            "invariants",
        }
        unconsumed = set(rules) - consumed
        self.assertEqual(unconsumed, set(rules["documentation_only"]))

    def test_rule_classes_and_invariants_are_no_longer_inert(self):
        """They were documentation_only until the failure-mode registry consumed them."""
        rules = json.loads((ROOT / "suite-rules.json").read_text(encoding="utf-8"))
        self.assertNotIn("rule_classes", rules["documentation_only"])
        self.assertNotIn("invariants", rules["documentation_only"])


class FailureModeRegistryTests(unittest.TestCase):
    """The registry is the shared vocabulary the harness routes on."""

    def setUp(self):
        self.rules = json.loads((ROOT / "suite-rules.json").read_text(encoding="utf-8"))
        self.registry = json.loads((ROOT / "failure-modes.json").read_text(encoding="utf-8"))
        self.modes = self.registry["failure_modes"]
        self.ids = {mode["id"] for mode in self.modes}

    def test_every_id_matches_the_scheme_and_is_unique(self):
        pattern = re.compile(r"^fm-[a-z0-9]+(?:-[a-z0-9]+)*$")
        seen = set()
        for mode in self.modes:
            identifier = mode["id"]
            self.assertRegex(identifier, pattern)
            self.assertLessEqual(len(identifier), 40, identifier)
            self.assertNotIn(identifier, seen, f"duplicate {identifier}")
            seen.add(identifier)

    def test_every_mode_explains_itself(self):
        for mode in self.modes:
            for field in ("title", "cause", "symptom", "fix"):
                self.assertTrue(str(mode.get(field, "")).strip(), f"{mode['id']} missing {field}")

    def test_every_mode_carries_a_declared_rule_class(self):
        classes = set(self.rules["rule_classes"])
        for mode in self.modes:
            self.assertIn(mode["rule_class"], classes, mode["id"])

    def test_every_declared_invariant_is_enforced_by_exactly_one_mode(self):
        enforced = [mode["invariant"] for mode in self.modes if mode.get("invariant")]
        self.assertCountEqual(enforced, set(enforced), "an invariant is claimed twice")
        self.assertEqual(set(enforced), set(self.rules["invariants"]))

    def test_the_thirteen_root_causes_are_present(self):
        roots = [mode for mode in self.modes if mode.get("origin") == "root-causes"]
        self.assertEqual(len(roots), 13)

    def test_gate_rules_reference_known_modes_and_routes(self):
        routes = set(self.registry["routes"])
        for rule in self.registry["gate_rules"]:
            self.assertIn(rule["route"], routes, rule["rule"])
            self.assertLessEqual(set(rule["failure_modes"]), self.ids, rule["rule"])

    def test_every_route_carries_what_the_router_needs(self):
        """A route the router cannot act on is worse than no rule at all."""
        for rule in self.registry["gate_rules"]:
            if rule["route"] == "retry":
                self.assertTrue(rule.get("correction", "").strip(), rule["rule"])
            elif rule["route"] == "ask":
                self.assertTrue(rule.get("question", "").strip(), rule["rule"])
            elif rule["route"] == "load_skill":
                self.assertTrue(rule.get("skill", "").strip(), rule["rule"])
            elif rule["route"] == "halt":
                self.assertTrue(rule.get("because", "").strip(), rule["rule"])

    def test_the_generated_typescript_module_matches_the_json(self):
        """One vocabulary, two languages.

        `studio/shared/failure-modes.ts` is generated and committed so the
        published package can read the registry without a repo-root file. This
        catches drift between the two even when the Node job never runs.
        """
        module = ROOT / "studio" / "shared" / "failure-modes.ts"
        self.assertTrue(module.is_file(), "run: npm run schema")
        text = module.read_text(encoding="utf-8")

        for identifier in self.ids:
            self.assertIn(f'"{identifier}"', text, f"{identifier} missing from the generated module")

        emitted = set(re.findall(r'"id":\s*"(fm-[a-z0-9-]+)"', text))
        self.assertEqual(emitted, self.ids, "the generated module and failure-modes.json disagree")

        for rule in self.registry["gate_rules"]:
            self.assertIn(f'"{rule["rule"]}"', text, f'{rule["rule"]} missing from the generated module')

    def test_the_generated_module_is_marked_generated(self):
        text = (ROOT / "studio" / "shared" / "failure-modes.ts").read_text(encoding="utf-8")
        self.assertIn("GENERATED", text)
        self.assertIn("failure-modes.json", text)


if __name__ == "__main__":
    unittest.main()
