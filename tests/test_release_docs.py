from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
LOCAL_LINK = re.compile(r"\[[^\]]+\]\((?!https?://|mailto:|#)([^)]+)\)")


class ReleaseDocumentationTests(unittest.TestCase):
    def test_release_version_is_consistent(self):
        version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
        self.assertRegex(version, r"^\d+\.\d+\.\d+$")
        self.assertIn(f"## [{version}]", (ROOT / "CHANGELOG.md").read_text(encoding="utf-8"))
        self.assertIn(f"v{version}", (ROOT / "RELEASE_NOTES.md").read_text(encoding="utf-8"))

    def test_local_markdown_links_resolve(self):
        failures = []
        for markdown in ROOT.rglob("*.md"):
            text = markdown.read_text(encoding="utf-8")
            for match in LOCAL_LINK.finditer(text):
                raw_target = match.group(1).strip()
                target = raw_target.split("#", 1)[0]
                if not target:
                    continue
                resolved = (markdown.parent / target).resolve()
                if not resolved.exists():
                    failures.append(f"{markdown.relative_to(ROOT)} -> {raw_target}")
        self.assertEqual(failures, [])

    def test_comparison_uses_one_shared_base_prompt(self):
        guide = (ROOT / "docs" / "COMPARISON_TEST.md").read_text(encoding="utf-8")
        self.assertEqual(guide.count("## Base prompt — copy without changes"), 1)
        self.assertEqual(guide.count("Use the installed skill named ls-design-websites"), 1)
        self.assertEqual(guide.count("Use the installed skill named ls-design-3d-web"), 1)


if __name__ == "__main__":
    unittest.main()
