from __future__ import annotations

import importlib.util
import json
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
            },
        )
        for contract in references.values():
            self.assertEqual(set(contract["consumers"]), skill_names)
            self.assertTrue((ROOT / contract["path"]).is_file(), contract["path"])

    def test_documentation_only_keys_are_declared(self):
        rules = json.loads((ROOT / "suite-rules.json").read_text(encoding="utf-8"))
        consumed = {"skill_count", "frontmatter_keys", "shared_references", "documentation_only"}
        unconsumed = set(rules) - consumed
        self.assertEqual(unconsumed, set(rules["documentation_only"]))


if __name__ == "__main__":
    unittest.main()
