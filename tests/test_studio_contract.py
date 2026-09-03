"""Validate the studio's data contract with the standard library only.

The generated JSON Schema is the source of truth for `design.json`. These checks
run in the Python job so a schema drift is caught even when Node is unavailable.
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
STUDIO = ROOT / "studio"
SCHEMA = STUDIO / "schema" / "design.schema.json"
TEMPLATE = ROOT / "skills" / "ls-design-contract" / "assets" / "design.template.json"
FIXTURE = STUDIO / "fixtures" / "orbit-one" / "design.json"


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def check(instance: Any, schema: dict[str, Any], root: dict[str, Any], path: str = "$") -> list[str]:
    """A deliberately small subset of JSON Schema: enough for this document, no dependency."""
    errors: list[str] = []

    if "$ref" in schema:
        target = schema["$ref"]
        if target.startswith("#/"):
            node: Any = root
            for part in target[2:].split("/"):
                node = node[part]
            return check(instance, node, root, path)

    if "anyOf" in schema:
        if not any(not check(instance, option, root, path) for option in schema["anyOf"]):
            errors.append(f"{path}: matches no branch of anyOf")
        return errors

    expected = schema.get("type")
    if expected == "object":
        if not isinstance(instance, dict):
            return [f"{path}: expected object, got {type(instance).__name__}"]
        for name in schema.get("required", []):
            if name not in instance:
                errors.append(f"{path}: missing required property {name!r}")
        for name, value in instance.items():
            child = schema.get("properties", {}).get(name)
            if child is not None:
                errors.extend(check(value, child, root, f"{path}.{name}"))
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}: unexpected property {name!r}")
            elif isinstance(schema.get("additionalProperties"), dict):
                errors.extend(check(value, schema["additionalProperties"], root, f"{path}.{name}"))
    elif expected == "array":
        if not isinstance(instance, list):
            return [f"{path}: expected array, got {type(instance).__name__}"]
        item = schema.get("items")
        if isinstance(item, dict):
            for index, value in enumerate(instance):
                errors.extend(check(value, item, root, f"{path}[{index}]"))
    elif expected == "string":
        if not isinstance(instance, str):
            return [f"{path}: expected string, got {type(instance).__name__}"]
        if "enum" in schema and instance not in schema["enum"]:
            errors.append(f"{path}: {instance!r} is not one of {schema['enum']}")
    elif expected in {"number", "integer"}:
        if isinstance(instance, bool) or not isinstance(instance, (int, float)):
            return [f"{path}: expected {expected}, got {type(instance).__name__}"]
        if expected == "integer" and not float(instance).is_integer():
            errors.append(f"{path}: expected an integer")
        if "const" in schema and instance != schema["const"]:
            errors.append(f"{path}: expected {schema['const']}, got {instance}")
    elif expected == "boolean":
        if not isinstance(instance, bool):
            return [f"{path}: expected boolean, got {type(instance).__name__}"]

    if "const" in schema and expected not in {"number", "integer"} and instance != schema["const"]:
        errors.append(f"{path}: expected {schema['const']!r}, got {instance!r}")
    return errors


class StudioSchemaTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCHEMA.is_file(), "run: cd studio && npm run schema")
        self.schema = load(SCHEMA)

    def test_schema_declares_version_one(self):
        version = self.schema["properties"]["schemaVersion"]
        self.assertEqual(version.get("const"), 1)

    def test_schema_requires_the_load_bearing_fields(self):
        required = set(self.schema.get("required", []))
        for field in ("schemaVersion", "rev", "seq", "project", "status", "generator", "gates"):
            self.assertIn(field, required, f"design.json must require {field}")

    def test_template_validates(self):
        self.assertEqual(check(load(TEMPLATE), self.schema, self.schema), [])

    def test_fixture_validates(self):
        self.assertTrue(FIXTURE.is_file(), "the orbit-one fixture is missing")
        self.assertEqual(check(load(FIXTURE), self.schema, self.schema), [])

    def test_fixture_is_a_passing_gate_with_two_approved_screens(self):
        state = load(FIXTURE)
        self.assertEqual(len(state["screens"]), 2)
        self.assertTrue(all(screen["decision"]["state"] == "approved" for screen in state["screens"]))
        self.assertTrue(all(not screen["staleTokens"] for screen in state["screens"]))

    def test_fixture_screen_files_exist_and_match_their_digests(self):
        import hashlib

        state = load(FIXTURE)
        base = FIXTURE.parent
        for screen in state["screens"]:
            for kind in ("html", "png"):
                path = base / screen["files"][kind]
                self.assertTrue(path.is_file(), f"missing fixture file {path}")
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                self.assertEqual(digest, screen["files"]["sha256"][kind], f"{path} digest drifted")

    def test_template_contrast_pairs_name_roles_the_palette_defines(self):
        template = load(TEMPLATE)
        design = (ROOT / "skills" / "ls-design-contract" / "assets" / "DESIGN.template.md").read_text(
            encoding="utf-8"
        )
        import re

        roles = set(re.findall(r"^  ([a-z][a-z0-9-]*): \"#", design, re.MULTILINE))
        for pair in template["contrastPairs"]:
            for side in ("foreground", "background"):
                self.assertIn(pair[side], roles, f"contrast pair names {pair[side]}, which the palette lacks")


if __name__ == "__main__":
    unittest.main()
