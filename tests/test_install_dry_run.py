from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
INSTALLER = ROOT / "scripts" / "install.py"


class ExistingDryRunTests(unittest.TestCase):
    def test_existing_destination_is_reported_without_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            install = subprocess.run(
                [sys.executable, str(INSTALLER), "--provider", "codex", "--target", str(target)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(install.returncode, 0, install.stderr)
            skill_file = target / ".agents" / "skills" / "ls-design" / "SKILL.md"
            before = skill_file.read_bytes()

            dry_run = subprocess.run(
                [
                    sys.executable,
                    str(INSTALLER),
                    "--provider",
                    "codex",
                    "--target",
                    str(target),
                    "--dry-run",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(dry_run.returncode, 0, dry_run.stderr)
            self.assertIn("would conflict with", dry_run.stdout)
            self.assertEqual(before, skill_file.read_bytes())


if __name__ == "__main__":
    unittest.main()
