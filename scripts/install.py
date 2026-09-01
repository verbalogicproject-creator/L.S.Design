#!/usr/bin/env python3
"""Install the canonical L.S.Design skills into supported provider layouts."""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
import tempfile
from pathlib import Path


SUITE_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = SUITE_ROOT / "skills"
PROVIDER_DIRS = {
    "codex": Path(".agents") / "skills",
    "claude": Path(".claude") / "skills",
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--provider",
        choices=("codex", "claude", "both"),
        default="both",
        help="provider layout to install (default: both)",
    )
    parser.add_argument(
        "--scope",
        choices=("project", "global"),
        default="project",
        help="use the current project or home directory as the base (default: project)",
    )
    parser.add_argument(
        "--target",
        type=Path,
        help="override the base directory; provider-relative paths are still appended",
    )
    parser.add_argument("--dry-run", action="store_true", help="print changes without writing")
    parser.add_argument("--force", action="store_true", help="replace existing skill directories")
    return parser.parse_args(argv)


def skill_sources() -> list[Path]:
    sources = sorted(path for path in SOURCE_ROOT.iterdir() if path.is_dir())
    invalid = [path for path in sources if not (path / "SKILL.md").is_file()]
    if invalid:
        names = ", ".join(path.name for path in invalid)
        raise RuntimeError(f"invalid skill directories without SKILL.md: {names}")
    if not sources:
        raise RuntimeError(f"no skills found in {SOURCE_ROOT}")
    return sources


def directory_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        relative = path.relative_to(root).as_posix().encode("utf-8")
        digest.update(len(relative).to_bytes(8, "big"))
        digest.update(relative)
        data = path.read_bytes()
        digest.update(len(data).to_bytes(8, "big"))
        digest.update(data)
    return digest.hexdigest()


def selected_providers(value: str) -> tuple[str, ...]:
    return tuple(PROVIDER_DIRS) if value == "both" else (value,)


def target_base(args: argparse.Namespace) -> Path:
    if args.target is not None:
        return args.target.expanduser().resolve()
    if args.scope == "global":
        return Path.home().resolve()
    return Path.cwd().resolve()


def install_skill(source: Path, destination: Path, force: bool) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and not force:
        raise FileExistsError(f"destination exists: {destination}; use --force to replace it")

    staging_parent = destination.parent
    staged = Path(tempfile.mkdtemp(prefix=f".{destination.name}.stage-", dir=staging_parent))
    backup: Path | None = None
    try:
        shutil.rmtree(staged)
        shutil.copytree(source, staged)
        if directory_digest(source) != directory_digest(staged):
            raise RuntimeError(f"staging checksum mismatch for {source.name}")

        if destination.exists():
            backup = Path(tempfile.mkdtemp(prefix=f".{destination.name}.backup-", dir=staging_parent))
            shutil.rmtree(backup)
            os.replace(destination, backup)
        try:
            os.replace(staged, destination)
        except Exception:
            if backup is not None and backup.exists() and not destination.exists():
                os.replace(backup, destination)
                backup = None
            raise

        if directory_digest(source) != directory_digest(destination):
            raise RuntimeError(f"installed checksum mismatch for {source.name}")
        if backup is not None:
            shutil.rmtree(backup)
            backup = None
    finally:
        if staged.exists():
            shutil.rmtree(staged)
        if backup is not None and backup.exists():
            shutil.rmtree(backup)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    base = target_base(args)
    operations = [
        (source, base / PROVIDER_DIRS[provider] / source.name, provider)
        for provider in selected_providers(args.provider)
        for source in skill_sources()
    ]

    if args.dry_run:
        for source, destination, provider in operations:
            if destination.exists() and not args.force:
                action = "would conflict with"
            elif destination.exists():
                action = "would replace"
            else:
                action = "would install"
            print(f"{action} {source.name} for {provider}: {destination}")
        return 0

    conflicts = [destination for _, destination, _ in operations if destination.exists()]
    if conflicts and not args.force:
        print("Installation refused because destinations already exist:", file=sys.stderr)
        for path in conflicts:
            print(f"  {path}", file=sys.stderr)
        print("Use --force to replace them or --dry-run to inspect targets.", file=sys.stderr)
        return 2

    for source, destination, provider in operations:
        install_skill(source, destination, args.force)
        print(f"installed {source.name} for {provider}: {destination}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
