from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
INSTALLER = ROOT / "scripts" / "install.py"


def load_installer():
    spec = importlib.util.spec_from_file_location("ls_design_installer", INSTALLER)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load installer")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class InstallerTests(unittest.TestCase):
    def run_installer(self, *args: str):
        return subprocess.run(
            [sys.executable, str(INSTALLER), *args],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_dry_run_does_not_write(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            result = self.run_installer("--target", str(target), "--dry-run")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((target / ".agents").exists())
            self.assertFalse((target / ".claude").exists())
            self.assertEqual(result.stdout.count("would install"), 18)

    def test_both_provider_layouts_have_matching_content(self):
        installer = load_installer()
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            result = self.run_installer("--target", str(target))
            self.assertEqual(result.returncode, 0, result.stderr)
            for source in installer.skill_sources():
                codex = target / ".agents" / "skills" / source.name
                claude = target / ".claude" / "skills" / source.name
                self.assertEqual(installer.directory_digest(source), installer.directory_digest(codex))
                self.assertEqual(installer.directory_digest(source), installer.directory_digest(claude))

    def test_existing_destination_is_refused_then_force_replaces(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            first = self.run_installer("--provider", "codex", "--target", str(target))
            self.assertEqual(first.returncode, 0, first.stderr)
            marker = target / ".agents" / "skills" / "ls-design" / "local-change.txt"
            marker.write_text("preserve unless forced", encoding="utf-8")

            refused = self.run_installer("--provider", "codex", "--target", str(target))
            self.assertEqual(refused.returncode, 2)
            self.assertTrue(marker.exists())

            forced = self.run_installer("--provider", "codex", "--target", str(target), "--force")
            self.assertEqual(forced.returncode, 0, forced.stderr)
            self.assertFalse(marker.exists())


if __name__ == "__main__":
    unittest.main()
