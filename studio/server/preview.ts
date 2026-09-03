import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ContrastPair, DesignState } from "../shared/schema.ts";
import { StudioError } from "../shared/schema.ts";
import { colorVar, emitTokensCss, type TokenModel } from "../shared/tokens.ts";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * `templates/` sits one level above the compiled server in the published
 * package and two levels above the source tree in this repository.
 */
export const TEMPLATE_ROOTS = [resolve(here, "..", "templates"), resolve(here, "..", "..", "templates")];

export async function readTemplate(name: string): Promise<string> {
  for (const base of TEMPLATE_ROOTS) {
    try {
      return await readFile(join(base, name), "utf8");
    } catch {
      continue;
    }
  }
  throw new StudioError("E_NO_STUDIO", `template ${name} not found next to the studio package`);
}

const TOKENS_REGION = /\/\* ls-design:tokens:start \*\/[\s\S]*?\/\* ls-design:tokens:end \*\//;
const PAIRS_REGION = /\/\* ls-design:pairs:start \*\/[\s\S]*?\/\* ls-design:pairs:end \*\//;

export interface PreviewInput {
  template: string;
  model: TokenModel;
  state: DesignState;
  /** The prose body of DESIGN.md, used to fill the summary from the contract itself. */
  body?: string;
  /** Substitutions that override anything read from the body. */
  fields?: Record<string, string>;
}

export interface OverviewSummary {
  premise: string | undefined;
  direction: string | undefined;
  counterpoint: string | undefined;
  signature: string | undefined;
}

/**
 * Reads the summary lines out of the contract's own Overview section, so the
 * preview shows what was decided rather than the template's prompts.
 */
export function readOverview(body: string): OverviewSummary {
  const section = /\n##\s+Overview\s*\n([\s\S]*?)(?=\n##\s|$)/.exec(body)?.[1] ?? "";
  const lead = (label: string): string | undefined => {
    const match = new RegExp(`\\*\\*${label}\\.?\\*\\*\\s*([^\n]+)`).exec(section);
    return match?.[1]?.trim();
  };
  const direction = lead("Direction");
  const primary = direction ? /Primary family:\s*([^.;]+)/.exec(direction)?.[1]?.trim() : undefined;
  const counterpoint = direction
    ? /(?:Quiet counterpoint|Counterpoint):\s*([^.;]+)/.exec(direction)?.[1]?.trim()
    : undefined;
  const signature = direction
    ? /Signature element:\s*([^.;]+)/.exec(direction)?.[1]?.trim()
    : undefined;
  return {
    premise: lead("Premise"),
    direction: primary ?? direction,
    counterpoint,
    signature,
  };
}

/**
 * Inlines the real tokens and the real contrast pairs into the preview so the
 * file opens from the filesystem and recomputes its own contrast in the browser.
 */
export function renderPreview(input: PreviewInput): string {
  const { template, model, state } = input;
  if (!TOKENS_REGION.test(template)) {
    throw new StudioError("E_NO_STUDIO", "preview template is missing its token region markers");
  }

  const css = indentBlock(stripBanner(emitTokensCss(model, { banner: "" })), "  ");
  let output = template.replace(
    TOKENS_REGION,
    `/* ls-design:tokens:start */\n${css}\n  /* ls-design:tokens:end */`,
  );

  const pairs = renderPairs(state.contrastPairs);
  output = output.replace(PAIRS_REGION, `/* ls-design:pairs:start */\n${pairs}\n  /* ls-design:pairs:end */`);

  const overview = input.body ? readOverview(input.body) : undefined;
  const approvals = state.approvals.length;
  const fields: Record<string, string> = {
    lang: state.project.lang,
    dir: state.project.dir,
    project_name: escapeHtml(model.name),
    font_link: "",
    contract_status: state.status,
    premise_sentence: escapeHtml(overview?.premise ?? model.description ?? "Recorded in DESIGN.md."),
    direction_family: escapeHtml(overview?.direction ?? "recorded in DESIGN.md"),
    direction_counterpoint: escapeHtml(overview?.counterpoint ?? "recorded in DESIGN.md"),
    signature_element: escapeHtml(overview?.signature ?? "recorded in DESIGN.md"),
    approval_log: approvals
      ? `${approvals} decision${approvals === 1 ? "" : "s"} recorded in design.json.`
      : "No decision recorded yet; confirm this preview before the contract is approved.",
    ...input.fields,
  };
  return output.replace(/\{\{([a-z_]+)\}\}/g, (match, key: string) => fields[key] ?? match);
}

function renderPairs(pairs: ContrastPair[]): string {
  const rows = (pairs.length ? pairs : []).map((pair) => {
    const label = `${pair.foreground} on ${pair.background}`;
    return `    [${JSON.stringify(label)}, ${JSON.stringify(colorVar(pair.foreground))}, ${JSON.stringify(
      colorVar(pair.background),
    )}, ${pair.target}]`;
  });
  return `  var pairs = [\n${rows.join(",\n")}\n  ];`;
}

function stripBanner(css: string): string {
  return css.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "").trimEnd();
}

function indentBlock(text: string, indent: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : `${indent}${line}`))
    .join("\n");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
