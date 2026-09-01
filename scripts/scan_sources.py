#!/usr/bin/env python3
"""Report hidden characters and instruction-like payloads in untrusted source files."""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from pathlib import Path


TEXT_SUFFIXES = {".html", ".htm", ".md", ".txt", ".js", ".jsx", ".ts", ".tsx", ".css", ".json", ".yaml", ".yml"}
SUSPICIOUS_CODEPOINTS = {
    0x200B,
    0x200C,
    0x200D,
    0x2060,
    0xFEFF,
    *range(0x202A, 0x202F),
    *range(0x2066, 0x206A),
}
PATTERNS = {
    "external-script": re.compile(r"<script\b[^>]*\bsrc\s*=\s*['\"]https?://", re.IGNORECASE),
    "agent-prompt": re.compile(r"\bprompt\s+(?:the\s+)?(?:agent|codex|claude|antigravity)\b", re.IGNORECASE),
    "direct-execution": re.compile(r"\b(?:feed|formatted)\s+(?:this|it)?\s*(?:directly\s+)?(?:into|to)\b", re.IGNORECASE),
    "control-token": re.compile(r"\b(?:START_[A-Z0-9_]+|SYSTEM_PROMPT|IGNORE_PREVIOUS|BEGIN_INSTRUCTIONS)\b"),
    "context-payload": re.compile(r"\.(?:ctx)\b|\bdeployment\s+roadmap\s*\([^)]*directives", re.IGNORECASE),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    return parser.parse_args()


def files_for(path: Path):
    if path.is_file():
        yield path
    elif path.is_dir():
        for item in sorted(path.rglob("*")):
            if item.is_file() and item.suffix.lower() in TEXT_SUFFIXES:
                yield item
    else:
        raise FileNotFoundError(path)


def scan(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="replace")
    findings: list[str] = []
    for index, character in enumerate(text):
        if ord(character) in SUSPICIOUS_CODEPOINTS:
            line = text.count("\n", 0, index) + 1
            findings.append(
                f"{path}:{line}: hidden-unicode U+{ord(character):04X} {unicodedata.name(character, 'UNKNOWN')}"
            )
    for label, pattern in PATTERNS.items():
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            excerpt = text.splitlines()[line - 1].strip()[:160]
            findings.append(f"{path}:{line}: {label}: {excerpt}")
    return findings


def main() -> int:
    args = parse_args()
    findings: list[str] = []
    try:
        for requested in args.paths:
            for path in files_for(requested):
                findings.extend(scan(path))
    except (OSError, UnicodeError) as exc:
        print(f"scan failed: {exc}", file=sys.stderr)
        return 2

    if findings:
        print(f"Found {len(findings)} item(s) requiring review:")
        for finding in findings:
            print(f"- {finding}")
        return 1
    print("No configured hidden-content or directive markers found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
