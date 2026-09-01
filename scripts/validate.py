#!/usr/bin/env python3
"""Validate L.S.Design structure, portability, links, and suite invariants."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / "skills"
RULES = ROOT / "suite-rules.json"
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
LINK_RE = re.compile(r"\[[^\]]+\]\((?!https?://|#)([^)]+)\)")
PROVIDER_MARKERS = ("codex", "claude", "openai", "anthropic", ".agents/", ".claude/")
SUSPICIOUS_CODEPOINTS = {
    0x200B,
    0x200C,
    0x200D,
    0x2060,
    0xFEFF,
    *range(0x202A, 0x202F),
    *range(0x2066, 0x206A),
}


def frontmatter(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("missing opening frontmatter delimiter")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise ValueError("missing closing frontmatter delimiter") from exc
    values: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip():
            continue
        if ":" not in line:
            raise ValueError(f"invalid frontmatter line: {line}")
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip()
    return values, "\n".join(lines[end + 1 :])


def suspicious_unicode(path: Path, text: str) -> list[str]:
    findings: list[str] = []
    for index, character in enumerate(text):
        if ord(character) in SUSPICIOUS_CODEPOINTS:
            line = text.count("\n", 0, index) + 1
            findings.append(
                f"{path}:{line}: U+{ord(character):04X} {unicodedata.name(character, 'UNKNOWN')}"
            )
    return findings


def validate() -> list[str]:
    errors: list[str] = []
    rules = json.loads(RULES.read_text(encoding="utf-8"))
    allowed_keys = set(rules["frontmatter_keys"])
    skill_dirs = sorted(path for path in SKILLS.iterdir() if path.is_dir())
    if len(skill_dirs) != rules["skill_count"]:
        errors.append(f"expected {rules['skill_count']} skills, found {len(skill_dirs)}")

    for skill_dir in skill_dirs:
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.is_file():
            errors.append(f"{skill_dir}: missing SKILL.md")
            continue
        try:
            metadata, body = frontmatter(skill_file)
        except ValueError as exc:
            errors.append(f"{skill_file}: {exc}")
            continue

        if set(metadata) != allowed_keys:
            errors.append(
                f"{skill_file}: frontmatter keys must be {sorted(allowed_keys)}, got {sorted(metadata)}"
            )
        name = metadata.get("name", "")
        if name != skill_dir.name:
            errors.append(f"{skill_file}: name {name!r} does not match folder {skill_dir.name!r}")
        if not NAME_RE.fullmatch(name) or len(name) > 63:
            errors.append(f"{skill_file}: invalid skill name {name!r}")
        if not metadata.get("description"):
            errors.append(f"{skill_file}: missing description")
        if "## Decision order" not in body:
            errors.append(f"{skill_file}: missing shared decision order")
        lowered = body.lower()
        for marker in PROVIDER_MARKERS:
            if marker in lowered:
                errors.append(f"{skill_file}: provider-specific marker in canonical skill: {marker}")

        for markdown in skill_dir.rglob("*.md"):
            text = markdown.read_text(encoding="utf-8")
            errors.extend(suspicious_unicode(markdown, text))
            for match in LINK_RE.finditer(text):
                target = match.group(1).split("#", 1)[0]
                if not target:
                    continue
                resolved = (markdown.parent / target).resolve()
                if not resolved.exists():
                    errors.append(f"{markdown}: broken relative link {match.group(1)!r}")
            if re.search(r"\b(TODO|TBD|PLACEHOLDER)\b", text, re.IGNORECASE):
                errors.append(f"{markdown}: unfinished scaffold marker")
    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("L.S.Design validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    count = sum(1 for path in SKILLS.iterdir() if path.is_dir())
    print(f"L.S.Design validation passed: {count} skills")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
