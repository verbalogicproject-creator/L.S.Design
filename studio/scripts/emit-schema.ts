#!/usr/bin/env node
/** Emits schema/design.schema.json from the zod source of truth. `--check` verifies freshness. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { designStateSchema } from "../shared/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "schema", "design.schema.json");

const jsonSchema = z.toJSONSchema(designStateSchema, { target: "draft-2020-12", io: "output" });
const document = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/verbalogicproject-creator/L.S.Design/studio/schema/design.schema.json",
  title: "L.S.Design studio design.json",
  ...jsonSchema,
};
const serialized = `${JSON.stringify(document, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    console.error("schema/design.schema.json is missing; run: npm run schema");
    process.exit(1);
  }
  if (current !== serialized) {
    console.error("schema/design.schema.json is stale; run: npm run schema");
    process.exit(1);
  }
  console.log("schema is current");
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, serialized, "utf8");
  console.log(`wrote ${target}`);
}
