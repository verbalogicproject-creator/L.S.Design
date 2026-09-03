import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

import { handoffDir, tokensCssPath } from "../shared/paths.ts";
import { lintTokenDrivenHtml } from "../shared/screen-lint.ts";

/*
  The build lint is the counterpart to the screen lint. The screen lint keeps a
  design honest before a person approves it; this keeps the implementation
  honest afterwards, by checking the shipped page against the very contract the
  approved screen rendered from. Every check here exists because its absence let
  a real defect through: a body role that fell back to the framework's default
  font, and a client-rendered page that was blank without scripting.
*/

export type Severity = "error" | "warning";

export interface LintFinding {
  readonly rule: string;
  readonly severity: Severity;
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
}

export interface LintCheck {
  readonly name: string;
  readonly status: "pass" | "fail" | "warn" | "skipped";
  readonly detail: string;
}

export interface LintBuildResult {
  readonly checks: LintCheck[];
  readonly findings: LintFinding[];
  readonly ok: boolean;
}

export interface LintBuildOptions {
  readonly projectRoot: string;
  readonly srcDir?: string | undefined;
  readonly url?: string | undefined;
  readonly widths?: number[] | undefined;
  readonly chromiumPath?: string | undefined;
}

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".astro"]);
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", "dist-ssr", "build", ".git", "coverage"]);
/* The contract's own generated files legitimately carry the literal values. */
const CONTRACT_FILENAMES = new Set(["tokens.css", "tailwind.theme.css", "fonts.css"]);

async function collectSourceFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIP_DIRECTORIES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (CONTRACT_FILENAMES.has(entry.name)) continue;
      if (SOURCE_EXTENSIONS.has(extname(entry.name)) || extname(entry.name) === ".css") found.push(full);
    }
  }
  await walk(root);
  return found.sort();
}

/** Reads the contract's light-theme token map from the handoff, else from design/. */
export async function readContractTokens(projectRoot: string): Promise<Map<string, string>> {
  const frozen = join(handoffDir(projectRoot), "tokens.css");
  const path = existsSync(frozen) ? frozen : tokensCssPath(projectRoot);
  const tokens = new Map<string, string>();
  if (!existsSync(path)) return tokens;
  const css = await readFile(path, "utf8");
  // Only the first :root block: later blocks are the dark and preference themes.
  const open = css.indexOf(":root");
  if (open === -1) return tokens;
  const start = css.indexOf("{", open);
  const end = css.indexOf("}", start);
  for (const line of css.slice(start + 1, end).split("\n")) {
    const match = /^\s*(--ls-[a-z0-9-]+)\s*:\s*([^;]+);/i.exec(line);
    if (match?.[1] && match[2]) tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

/*
  A browser hands back what its parser and any minifier produced: "#fff" for
  "#FFFFFF", ".5rem" for "0.5rem", and the substituted value where the contract
  wrote var(). Comparing raw text would report all of that as drift, so both
  sides are resolved and normalised before they are compared.
*/
function resolveContractValue(name: string, tokens: Map<string, string>, depth = 0): string {
  const raw = tokens.get(name);
  if (raw === undefined || depth > 8) return raw ?? "";
  return raw.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)/gi, (whole, referenced: string) =>
    tokens.has(referenced) ? resolveContractValue(referenced, tokens, depth + 1) : whole,
  );
}

export function normaliseCssValue(value: string): string {
  let text = value.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*,\s*/g, ",");
  text = text.replace(/(^|[\s,(\-+])\.(\d)/g, "$10.$2");
  text = text.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g, "#$1$1$2$2$3$3");
  text = text.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])\b/g, "#$1$1$2$2$3$3$4$4");
  return text.replace(/["']/g, "");
}

const PROPS_INTERFACE_RE = /(?:interface|type)\s+([A-Z][A-Za-z0-9_]*)Props\b/;
const COMPONENT_EXPORT_RE = /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/;
const ANCHOR_RE = /href=(?:"|'|\{")#([A-Za-z][\w-]*)(?:"|'|"\})/g;
const EMPTY_ANCHOR_RE = /href=(?:"|'|\{")#(?:"|'|"\})/g;
const ID_RE = /\bid=(?:"|'|\{")([A-Za-z][\w-]*)(?:"|'|"\})/g;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** Static half: what can be judged from the source without running a browser. */
export async function lintBuildSource(options: LintBuildOptions): Promise<LintBuildResult> {
  const root = options.srcDir ?? join(options.projectRoot, "src");
  const findings: LintFinding[] = [];
  const checks: LintCheck[] = [];

  if (!existsSync(root)) {
    return {
      checks: [{ name: "source", status: "skipped", detail: `no source directory at ${root}` }],
      findings,
      ok: true,
    };
  }

  const files = await collectSourceFiles(root);
  const rel = (file: string) => relative(options.projectRoot, file);

  let literalCount = 0;
  let componentFiles = 0;
  let missingProps = 0;
  const declaredIds = new Set<string>();
  const anchorTargets: Array<{ target: string; file: string; line: number }> = [];
  let emptyAnchors = 0;

  for (const file of files) {
    const text = await readFile(file, "utf8");

    // The contract is law: no colour literal, no remote asset, in build source.
    for (const finding of lintTokenDrivenHtml(text)) {
      literalCount += 1;
      findings.push({
        rule: finding.rule,
        severity: "error",
        message: `${finding.rule} "${finding.match}" — use a contract token`,
        file: rel(file),
        line: finding.line,
      });
    }

    if (extname(file) === ".tsx" || extname(file) === ".jsx") {
      const exportsComponent = COMPONENT_EXPORT_RE.test(text);
      const takesProps = /function\s+[A-Z][A-Za-z0-9_]*\s*\(\s*[^)]/.test(text);
      if (exportsComponent && takesProps) {
        componentFiles += 1;
        if (!PROPS_INTERFACE_RE.test(text)) {
          missingProps += 1;
          findings.push({
            rule: "missing-props-interface",
            severity: "warning",
            message: "a component that takes props should declare a named `<Name>Props` type",
            file: rel(file),
          });
        }
      }
    }

    for (const match of text.matchAll(ID_RE)) if (match[1]) declaredIds.add(match[1]);
    for (const match of text.matchAll(ANCHOR_RE)) {
      if (match[1]) anchorTargets.push({ target: match[1], file: rel(file), line: lineOf(text, match.index) });
    }
    for (const match of text.matchAll(EMPTY_ANCHOR_RE)) {
      emptyAnchors += 1;
      findings.push({
        rule: "placeholder-anchor",
        severity: "error",
        message: 'href="#" is a generator placeholder — point it at a real target or a route',
        file: rel(file),
        line: lineOf(text, match.index),
      });
    }
  }

  const dangling = anchorTargets.filter((anchor) => !declaredIds.has(anchor.target));
  for (const anchor of dangling) {
    findings.push({
      rule: "dangling-anchor",
      severity: "error",
      message: `href="#${anchor.target}" has no matching id in the source`,
      file: anchor.file,
      line: anchor.line,
    });
  }

  checks.push(
    {
      name: "colour and asset literals",
      status: literalCount === 0 ? "pass" : "fail",
      detail: literalCount === 0 ? `${files.length} files, none found` : `${literalCount} found`,
    },
    {
      name: "navigation targets",
      status: emptyAnchors === 0 && dangling.length === 0 ? "pass" : "fail",
      detail:
        emptyAnchors === 0 && dangling.length === 0
          ? `${anchorTargets.length} anchors all resolve`
          : `${emptyAnchors} placeholder, ${dangling.length} dangling`,
    },
    {
      name: "component props interfaces",
      status: missingProps === 0 ? "pass" : "warn",
      detail: `${componentFiles - missingProps}/${componentFiles} components declare one`,
    },
  );

  return { checks, findings, ok: findings.every((finding) => finding.severity !== "error") };
}

export interface PageLintOptions {
  readonly url: string;
  readonly tokens: Map<string, string>;
  readonly widths: number[];
  readonly chromiumPath?: string | undefined;
}

/**
 * Live half: the page as a browser sees it. The body-role probe is the check
 * that matters most — it renders an element from the contract's own body
 * tokens and compares it with what the page actually gives `body`, which is
 * how a framework's default font stack silently winning gets caught.
 */
export async function lintBuiltPage(options: PageLintOptions): Promise<LintBuildResult> {
  const { chromium } = await import("playwright-core");
  const executablePath = options.chromiumPath ?? process.env["LS_DESIGN_CHROMIUM"];
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox"],
  });
  const checks: LintCheck[] = [];
  const findings: LintFinding[] = [];

  try {
    const origin = new URL(options.url).origin;

    // 1. Same tokens as the contract, and the body role bound to them.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const remote: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) remote.push(url);
    });
    await page.goto(options.url, { waitUntil: "networkidle" });

    const names = [...options.tokens.keys()];
    const observed = await page.evaluate((tokenNames: string[]) => {
      const root = getComputedStyle(document.documentElement);
      const values: Record<string, string> = {};
      for (const name of tokenNames) values[name] = root.getPropertyValue(name).trim();

      // A probe styled only from the contract's body role, compared with body.
      const probe = document.createElement("p");
      probe.style.cssText =
        "position:absolute;visibility:hidden;font-family:var(--ls-font-body);" +
        "font-size:var(--ls-text-body);font-weight:var(--ls-weight-body);line-height:var(--ls-leading-body)";
      document.body.appendChild(probe);
      const p = getComputedStyle(probe);
      const b = getComputedStyle(document.body);
      const role = {
        expected: { family: p.fontFamily, size: p.fontSize, weight: p.fontWeight, leading: p.lineHeight },
        actual: { family: b.fontFamily, size: b.fontSize, weight: b.fontWeight, leading: b.lineHeight },
      };
      probe.remove();
      return { values, role };
    }, names);

    const mismatched = names.filter((name) => {
      const onPage = normaliseCssValue(observed.values[name] ?? "");
      const inContract = normaliseCssValue(resolveContractValue(name, options.tokens));
      return onPage !== inContract;
    });
    for (const name of mismatched) {
      findings.push({
        rule: "token-mismatch",
        severity: "error",
        message:
          `${name} is "${observed.values[name] ?? ""}" on the page but ` +
          `"${resolveContractValue(name, options.tokens)}" in the contract`,
      });
    }
    checks.push({
      name: "contract tokens on the page",
      status: mismatched.length === 0 ? "pass" : "fail",
      detail: mismatched.length === 0 ? `${names.length} tokens identical` : `${mismatched.length} of ${names.length} differ`,
    });

    const role = observed.role;
    const roleMatches =
      role.expected.family === role.actual.family &&
      role.expected.size === role.actual.size &&
      role.expected.weight === role.actual.weight;
    if (!roleMatches) {
      findings.push({
        rule: "body-role-drift",
        severity: "error",
        message:
          `body renders as ${role.actual.family} ${role.actual.size} ${role.actual.weight}, ` +
          `but the contract's body role is ${role.expected.family} ${role.expected.size} ${role.expected.weight}`,
      });
    }
    checks.push({
      name: "body type role",
      status: roleMatches ? "pass" : "fail",
      detail: roleMatches ? `${role.actual.family.split(",")[0]} ${role.actual.size}` : "drifted from the contract",
    });

    // 2. Nothing is fetched from anywhere else.
    if (remote.length > 0) {
      findings.push({
        rule: "remote-request",
        severity: "error",
        message: `the page requested ${remote.length} off-origin resource(s): ${remote.slice(0, 3).join(", ")}`,
      });
    }
    checks.push({
      name: "runtime requests stay local",
      status: remote.length === 0 ? "pass" : "fail",
      detail: remote.length === 0 ? "no off-origin requests" : `${remote.length} off-origin`,
    });
    await page.close();

    // 3. Readable with scripting off.
    const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
    const bare = await noScriptContext.newPage();
    await bare.goto(options.url, { waitUntil: "load" });
    const text = (await bare.evaluate(() => document.body.innerText ?? "")).trim();
    await noScriptContext.close();
    if (text.length < 200) {
      findings.push({
        rule: "blank-without-script",
        severity: "error",
        message: `only ${text.length} characters render with scripting disabled; prerender the page or serve it statically`,
      });
    }
    checks.push({
      name: "readable without scripting",
      status: text.length >= 200 ? "pass" : "fail",
      detail: `${text.length} characters`,
    });

    // 4. No horizontal overflow at any declared width.
    const overflowing: number[] = [];
    for (const width of options.widths) {
      const narrow = await browser.newPage({ viewport: { width, height: 900 } });
      await narrow.goto(options.url, { waitUntil: "networkidle" });
      const overflows = await narrow.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      if (overflows) overflowing.push(width);
      await narrow.close();
    }
    for (const width of overflowing) {
      findings.push({ rule: "horizontal-overflow", severity: "error", message: `the page scrolls sideways at ${width}px` });
    }
    checks.push({
      name: "no horizontal overflow",
      status: overflowing.length === 0 ? "pass" : "fail",
      detail: overflowing.length === 0 ? `clean at ${options.widths.join(", ")}` : `overflows at ${overflowing.join(", ")}`,
    });
  } finally {
    await browser.close();
  }

  return { checks, findings, ok: findings.every((finding) => finding.severity !== "error") };
}

export function formatLintReport(result: LintBuildResult): string {
  const symbol = { pass: "ok  ", fail: "FAIL", warn: "warn", skipped: "--  " } as const;
  const lines = result.checks.map((check) => `  ${symbol[check.status]}  ${check.name} — ${check.detail}`);
  if (result.findings.length > 0) {
    lines.push("");
    for (const finding of result.findings) {
      const where = finding.file ? ` ${finding.file}${finding.line ? `:${finding.line}` : ""}` : "";
      lines.push(`  ${finding.severity === "error" ? "error" : "warn "}${where} ${finding.message}`);
    }
  }
  return lines.join("\n");
}

export function mergeResults(...results: LintBuildResult[]): LintBuildResult {
  const checks = results.flatMap((result) => result.checks);
  const findings = results.flatMap((result) => result.findings);
  return { checks, findings, ok: findings.every((finding) => finding.severity !== "error") };
}
