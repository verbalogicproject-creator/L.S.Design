/**
 * A token-driven screen promises that its appearance comes from the project's
 * tokens and nothing else. That promise is only worth something if it is
 * checked, so the studio refuses to store a screen that breaks it.
 */

/*
  #rgb, #rgba, #rrggbb, #rrggbbaa. The lookbehind keeps numeric character
  references such as &#8209; out of the results: they are text, not colour.
*/
const HEX_COLOR_RE = /(?<![&\w])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
const FUNCTIONAL_COLOR_RE = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\s*\(/gi;
const REMOTE_URL_RE = /\b(?:src|href)\s*=\s*["']https?:\/\//gi;
const IMPORT_URL_RE = /@import\s+(?:url\()?["']?https?:\/\//gi;

export interface ScreenLintFinding {
  rule: string;
  match: string;
  line: number;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

function collect(text: string, pattern: RegExp, rule: string): ScreenLintFinding[] {
  const findings: ScreenLintFinding[] = [];
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let match: RegExpExecArray | null = re.exec(text);
  while (match !== null) {
    findings.push({ rule, match: match[0], line: lineOf(text, match.index) });
    match = re.exec(text);
  }
  return findings;
}

/**
 * Returns every violation in a token-driven screen's HTML. An empty array means
 * the screen renders purely from tokens and same-origin assets.
 */
export function lintTokenDrivenHtml(html: string): ScreenLintFinding[] {
  return [
    ...collect(html, HEX_COLOR_RE, "hex-color-literal"),
    ...collect(html, FUNCTIONAL_COLOR_RE, "functional-color-literal"),
    ...collect(html, REMOTE_URL_RE, "remote-asset"),
    ...collect(html, IMPORT_URL_RE, "remote-stylesheet-import"),
  ].sort((a, b) => a.line - b.line);
}

export function describeFindings(findings: ScreenLintFinding[], limit = 6): string {
  const shown = findings.slice(0, limit).map((f) => `${f.rule} "${f.match}" (line ${f.line})`);
  const rest = findings.length - shown.length;
  return rest > 0 ? `${shown.join("; ")}; and ${rest} more` : shown.join("; ");
}
