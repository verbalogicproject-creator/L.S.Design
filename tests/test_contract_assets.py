"""Hygiene checks for the contract templates and every text file in the repository."""

from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "skills" / "ls-design-contract" / "assets"
STUDIO_TEMPLATES = ROOT / "studio" / "templates"

TEXT_SUFFIXES = {".md", ".css", ".html", ".json", ".ts", ".tsx", ".js", ".mjs", ".py", ".yml", ".yaml", ".txt"}
SKIP_DIRECTORIES = {"node_modules", "dist", "__pycache__", ".git"}

BIDI_CONTROLS = {
    0x200B,
    0x200C,
    0x200D,
    0x2060,
    0xFEFF,
    *range(0x202A, 0x202F),
    *range(0x2066, 0x206A),
}

PHYSICAL_DIRECTION = re.compile(
    r"margin-left|margin-right|padding-left|padding-right|border-left|border-right"
    r"|(?<![\w-])left\s*:|(?<![\w-])right\s*:"
    r"|text-align\s*:\s*(?:left|right)|float\s*:\s*(?:left|right)",
    re.IGNORECASE,
)

TEMPLATES = ("DESIGN.template.md", "tokens.template.css", "preview.template.html", "design.template.json")


def repository_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        parts = set(path.relative_to(ROOT).parts)
        if parts & SKIP_DIRECTORIES or any(part.startswith(".") for part in path.relative_to(ROOT).parts[:-1]):
            continue
        files.append(path)
    return files


class ContractAssetTests(unittest.TestCase):
    def test_every_template_exists(self):
        for name in TEMPLATES:
            self.assertTrue((ASSETS / name).is_file(), f"missing asset {name}")
            self.assertTrue((STUDIO_TEMPLATES / name).is_file(), f"missing studio template {name}")

    def test_studio_templates_are_byte_identical_to_the_skill_assets(self):
        for name in TEMPLATES:
            self.assertEqual(
                (ASSETS / name).read_bytes(),
                (STUDIO_TEMPLATES / name).read_bytes(),
                f"{name} has drifted between the skill asset and the studio template",
            )

    def test_token_and_preview_templates_use_logical_properties(self):
        for name in ("tokens.template.css", "preview.template.html"):
            for number, line in enumerate((ASSETS / name).read_text(encoding="utf-8").splitlines(), 1):
                if "physical-ok" in line:
                    continue
                self.assertIsNone(
                    PHYSICAL_DIRECTION.search(line),
                    f"{name}:{number} uses a physical directional property without a physical-ok note",
                )

    def test_preview_template_is_self_contained_and_parameterized(self):
        text = (ASSETS / "preview.template.html").read_text(encoding="utf-8")
        self.assertIn('lang="{{lang}}"', text)
        self.assertIn('dir="{{dir}}"', text)
        self.assertIsNone(re.search(r"<script\b[^>]*\bsrc\s*=\s*['\"]https?://", text, re.IGNORECASE))
        self.assertIsNone(re.search(r"<iframe", text, re.IGNORECASE))
        for marker in ("ls-design:tokens:start", "ls-design:tokens:end", "ls-design:pairs:start", "ls-design:pairs:end"):
            self.assertIn(marker, text, f"preview template lost its {marker} marker")

    def test_design_template_declares_a_dark_twin_for_every_tested_role(self):
        text = (ASSETS / "DESIGN.template.md").read_text(encoding="utf-8")
        light = set(re.findall(r"^  ([a-z][a-z0-9-]*): \"#", text, re.MULTILINE))
        dark = {name[len("dark-") :] for name in light if name.startswith("dark-")}
        light = {name for name in light if not name.startswith("dark-")}
        self.assertTrue(dark.issubset(light), f"dark tokens with no light counterpart: {sorted(dark - light)}")
        for role in ("background", "surface", "content", "primary", "on-primary"):
            self.assertIn(role, light, f"the default palette must define {role}")
            self.assertIn(role, dark, f"the default palette must define a dark twin for {role}")


class RepositoryHygieneTests(unittest.TestCase):
    def test_no_byte_order_mark_or_bidi_control_anywhere(self):
        offenders: list[str] = []
        for path in repository_files():
            text = path.read_text(encoding="utf-8", errors="replace")
            if text.startswith("\ufeff"):
                offenders.append(f"{path.relative_to(ROOT)}: byte order mark")
            for index, character in enumerate(text):
                if ord(character) in BIDI_CONTROLS:
                    line = text.count("\n", 0, index) + 1
                    offenders.append(f"{path.relative_to(ROOT)}:{line}: U+{ord(character):04X}")
        self.assertEqual(offenders, [])

    def test_no_authored_file_is_missing_a_trailing_newline(self):
        # studio/fixtures holds byte-exact captured artifacts whose digests are
        # recorded in design.json, so they are excluded rather than rewritten.
        offenders = [
            str(path.relative_to(ROOT))
            for path in repository_files()
            if "fixtures" not in path.relative_to(ROOT).parts
            and path.read_bytes()
            and not path.read_bytes().endswith(b"\n")
        ]
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
