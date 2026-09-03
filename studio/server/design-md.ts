import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { parse, stringify } from "yaml";

import { StudioError } from "../shared/schema.ts";
import type { DesignFrontmatter } from "../shared/tokens.ts";

const DELIMITER = "---";

export interface DesignDocument {
  frontmatter: DesignFrontmatter;
  /** Everything after the closing delimiter, byte-for-byte. Never rewritten. */
  body: string;
}

/**
 * Splits a design.md document into its YAML frontmatter and its prose.
 * The prose is preserved exactly, so a token edit can never reword the design.
 */
export function parseDesignMd(text: string): DesignDocument {
  const normalized = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = normalized.split("\n");
  if (lines[0]?.trim() !== DELIMITER) {
    throw new StudioError("E_TOKENS_INVALID", "DESIGN.md is missing its opening frontmatter delimiter");
  }
  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === DELIMITER) {
      end = index;
      break;
    }
  }
  if (end === -1) {
    throw new StudioError("E_TOKENS_INVALID", "DESIGN.md is missing its closing frontmatter delimiter");
  }

  let parsed: unknown;
  try {
    parsed = parse(lines.slice(1, end).join("\n"));
  } catch (error) {
    throw new StudioError("E_TOKENS_INVALID", `DESIGN.md frontmatter is not valid YAML: ${String(error)}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new StudioError("E_TOKENS_INVALID", "DESIGN.md frontmatter must be a mapping");
  }
  return {
    frontmatter: parsed as DesignFrontmatter,
    // The leading newline belongs to the closing delimiter's own line. Keeping it
    // in the body is what makes serialize(parse(x)) === x for any number of rounds.
    body: `\n${lines.slice(end + 1).join("\n")}`,
  };
}

export function serializeDesignMd(document: DesignDocument): string {
  const yaml = stringify(document.frontmatter, {
    lineWidth: 0,
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN",
  }).replace(/\n$/, "");
  return `${DELIMITER}\n${yaml}\n${DELIMITER}${document.body}`;
}

export async function readDesignMd(path: string): Promise<DesignDocument> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new StudioError("E_NO_STUDIO", `no DESIGN.md at ${path}; run "ls-design-studio init" first`);
  }
  return parseDesignMd(text);
}

/** Atomic write: temp file then rename, so a reader never sees a half-written document. */
export async function writeFileAtomic(path: string, contents: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temp, contents);
  await rename(temp, path);
}

export async function writeDesignMd(path: string, document: DesignDocument): Promise<string> {
  const text = serializeDesignMd(document);
  await writeFileAtomic(path, text);
  return text;
}

/**
 * Replaces only the token groups, leaving every other frontmatter key and the
 * whole prose body untouched. This is what a token edit in the browser calls.
 */
export function mergeTokens(
  document: DesignDocument,
  tokens: Record<string, unknown>,
): DesignDocument {
  const next: DesignFrontmatter = { ...document.frontmatter };
  for (const key of ["name", "description", "version", "colors", "typography", "rounded", "spacing", "components"]) {
    if (!(key in tokens)) continue;
    const value = tokens[key];
    if (value === undefined || value === null) delete next[key];
    else next[key] = value as never;
  }
  return { frontmatter: next, body: document.body };
}
