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
LINK_RE = re.compile(r"\[[^\]]+\]\((?!https?://|mailto:|tel:|#)([^)]+)\)")
PROVIDER_MARKERS = ("codex", "claude", "openai", "anthropic", ".agents/", ".claude/")
DESCRIPTION_WARN_LENGTH = 1536
SUSPICIOUS_CODEPOINTS = {
    0x200B,
    0x200C,
    0x200D,
    0x2060,
    0xFEFF,
    *range(0x202A, 0x202F),
    *range(0x2066, 0x206A),
}
SCAFFOLD_RE = re.compile(r"\b(TODO|TBD|PLACEHOLDER)\b", re.IGNORECASE)
# Source files legitimately contain the HTML "placeholder" attribute and the CSS
# "::placeholder" selector, so only an uppercase marker counts outside markdown.
SCAFFOLD_SOURCE_RE = re.compile(r"\b(?:TODO|TBD)\b|(?<![-:\w])PLACEHOLDER\b")
SOURCE_SUFFIXES = (".html", ".css", ".json")
PHYSICAL_DIRECTION_RE = re.compile(
    r"margin-left|margin-right|padding-left|padding-right|border-left|border-right"
    r"|(?<![\w-])left\s*:|(?<![\w-])right\s*:"
    r"|text-align\s*:\s*(?:left|right)|float\s*:\s*(?:left|right)",
    re.IGNORECASE,
)
PHYSICAL_ESCAPE = "physical-ok"
PREVIEW_TEMPLATE = "preview.template.html"
PREVIEW_REQUIRED = ('lang="{{lang}}"', 'dir="{{dir}}"')
PREVIEW_FORBIDDEN_RE = re.compile(r"<script\b[^>]*\bsrc\s*=\s*['\"]https?://", re.IGNORECASE)


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


def provider_markers(path: Path, text: str, label: str) -> list[str]:
    lowered = text.lower()
    return [
        f"{path}: provider-specific marker in {label}: {marker}"
        for marker in PROVIDER_MARKERS
        if marker in lowered
    ]


def physical_direction(path: Path, text: str) -> list[str]:
    findings: list[str] = []
    for number, line in enumerate(text.splitlines(), 1):
        if PHYSICAL_ESCAPE in line:
            continue
        if PHYSICAL_DIRECTION_RE.search(line):
            findings.append(
                f"{path}:{number}: physical directional CSS without a {PHYSICAL_ESCAPE!r} note"
            )
    return findings


def check_preview_template(path: Path, text: str) -> list[str]:
    findings: list[str] = []
    for required in PREVIEW_REQUIRED:
        if required not in text:
            findings.append(f"{path}: preview template must carry {required}")
    if PREVIEW_FORBIDDEN_RE.search(text):
        findings.append(f"{path}: preview template must not load a remote script")
    return findings


def validate() -> list[str]:
    errors: list[str] = []
    rules = json.loads(RULES.read_text(encoding="utf-8"))
    allowed_keys = set(rules["frontmatter_keys"])
    skill_dirs = sorted(path for path in SKILLS.iterdir() if path.is_dir())
    if len(skill_dirs) != rules["skill_count"]:
        errors.append(f"expected {rules['skill_count']} skills, found {len(skill_dirs)}")

    consumed_keys = {"skill_count", "frontmatter_keys", "shared_references", "documentation_only"}
    declared_documentation_only = set(rules.get("documentation_only", []))
    unconsumed_keys = set(rules) - consumed_keys
    if unconsumed_keys != declared_documentation_only:
        errors.append(
            "suite-rules.json documentation_only must equal "
            f"{sorted(unconsumed_keys)}, got {sorted(declared_documentation_only)}"
        )

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
        description = metadata.get("description", "")
        if not description:
            errors.append(f"{skill_file}: missing description")
        if "## Decision order" not in body:
            errors.append(f"{skill_file}: missing shared decision order")
        errors.extend(provider_markers(skill_file, body, "canonical skill"))
        errors.extend(provider_markers(skill_file, description, "skill description"))

        for markdown in skill_dir.rglob("*.md"):
            text = markdown.read_text(encoding="utf-8")
            if text.startswith("\ufeff"):
                errors.append(f"{markdown}: file starts with a byte order mark")
            errors.extend(suspicious_unicode(markdown, text))
            if markdown != skill_file:
                errors.extend(provider_markers(markdown, text, "skill reference"))
            for match in LINK_RE.finditer(text):
                target = match.group(1).split("#", 1)[0]
                if not target:
                    continue
                resolved = (markdown.parent / target).resolve()
                if not resolved.exists():
                    errors.append(f"{markdown}: broken relative link {match.group(1)!r}")
            if SCAFFOLD_RE.search(text):
                errors.append(f"{markdown}: unfinished scaffold marker")

        for source in sorted(skill_dir.rglob("*")):
            if not source.is_file() or source.suffix.lower() not in SOURCE_SUFFIXES:
                continue
            text = source.read_text(encoding="utf-8")
            if text.startswith("\ufeff"):
                errors.append(f"{source}: file starts with a byte order mark")
            errors.extend(suspicious_unicode(source, text))
            if SCAFFOLD_SOURCE_RE.search(text):
                errors.append(f"{source}: unfinished scaffold marker")
            if source.parent.name == "assets" and source.suffix.lower() in (".css", ".html"):
                errors.extend(physical_direction(source, text))
            if source.name == PREVIEW_TEMPLATE:
                errors.extend(check_preview_template(source, text))

    for reference_name, contract in rules.get("shared_references", {}).items():
        relative = Path(contract.get("path", ""))
        reference = (ROOT / relative).resolve()
        if not reference.is_file():
            errors.append(f"shared reference {reference_name!r} is missing: {relative}")
            continue

        for skill_name in contract.get("consumers", []):
            skill_file = SKILLS / skill_name / "SKILL.md"
            if not skill_file.is_file():
                errors.append(
                    f"shared reference {reference_name!r} has unknown consumer {skill_name!r}"
                )
                continue

            linked: set[Path] = set()
            text = skill_file.read_text(encoding="utf-8")
            for match in LINK_RE.finditer(text):
                target = match.group(1).split("#", 1)[0]
                if target:
                    linked.add((skill_file.parent / target).resolve())
            if reference not in linked:
                errors.append(f"{skill_file}: must link shared reference {reference_name!r}")
    return errors


def collect_warnings() -> list[str]:
    warnings: list[str] = []
    for skill_dir in sorted(path for path in SKILLS.iterdir() if path.is_dir()):
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.is_file():
            continue
        try:
            metadata, _ = frontmatter(skill_file)
        except ValueError:
            continue
        description = metadata.get("description", "")
        if len(description) > DESCRIPTION_WARN_LENGTH:
            warnings.append(
                f"{skill_file}: description is {len(description)} characters, "
                f"over the {DESCRIPTION_WARN_LENGTH}-character budget"
            )
    return warnings


def main() -> int:
    errors = validate()
    for warning in collect_warnings():
        print(f"WARNING: {warning}", file=sys.stderr)
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
