const MAX_FINDINGS = 200;
const CONTEXT_RADIUS = 60; // half-width either side; clipped context is <= 120 chars

export type FixtureKind = "price" | "rating" | "count" | "quote" | "name" | "logo";

export interface FixtureFinding {
  kind: FixtureKind;
  value: string;
  context: string;
}

const CURRENCY_RE = /(?:[$€£¥]\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:USD|EUR|GBP))/g;
const RATING_RE = /\b\d(?:\.\d)?\s?(?:\/\s?5|stars?)\b/gi;
const COUNT_RE = /\b\d[\d,]*\+?\s*(?:customers|users|clients|reviews|downloads|members|companies)\b/gi;
const BLOCKQUOTE_RE = /<(blockquote|q)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const TESTIMONIAL_NAME_RE = /[—-]\s*([A-Z][a-z]+(?:\s+[A-Z]\.|\s+[A-Z][a-z]+)),?/g;
const ALT_LOGO_RE = /<img\b[^>]*\balt\s*=\s*["']([^"']*logo[^"']*)["'][^>]*>/gi;

/**
 * Finds plausible-but-invented content (prices, ratings, counts, quotes,
 * testimonial names, logo alt text) inside generated HTML so the builder can
 * quarantine and replace it rather than ship it as real data.
 */
export function detectFixtures(html: string): FixtureFinding[] {
  const visibleText = stripTags(html);
  const findings: FixtureFinding[] = [];
  const seen = new Set<string>();

  const add = (kind: FixtureKind, rawValue: string, contextSource: string, matchIndex: number): void => {
    const value = rawValue.trim();
    if (value === "") return;
    const key = `${kind}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ kind, value, context: clipContext(contextSource, matchIndex, rawValue.length) });
  };

  collect(CURRENCY_RE, visibleText, "price", add);
  collect(RATING_RE, visibleText, "rating", add);
  collect(COUNT_RE, visibleText, "count", add);

  for (const match of html.matchAll(BLOCKQUOTE_RE)) {
    if (findings.length >= MAX_FINDINGS) break;
    const inner = stripTags(match[2] ?? "");
    if (inner.trim() === "") continue;
    add("quote", inner, inner, 0);
  }

  for (const match of visibleText.matchAll(TESTIMONIAL_NAME_RE)) {
    if (findings.length >= MAX_FINDINGS) break;
    const name = match[1];
    if (name === undefined) continue;
    add("name", name, visibleText, match.index ?? 0);
  }

  for (const match of html.matchAll(ALT_LOGO_RE)) {
    if (findings.length >= MAX_FINDINGS) break;
    const alt = match[1];
    if (alt === undefined) continue;
    add("logo", alt, alt, 0);
  }

  return findings.slice(0, MAX_FINDINGS);
}

function collect(
  regex: RegExp,
  text: string,
  kind: FixtureKind,
  add: (kind: FixtureKind, value: string, contextSource: string, matchIndex: number) => void,
): void {
  for (const match of text.matchAll(regex)) {
    add(kind, match[0], text, match.index ?? 0);
  }
}

function clipContext(source: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - CONTEXT_RADIUS);
  const end = Math.min(source.length, matchIndex + matchLength + CONTEXT_RADIUS);
  const context = source.slice(start, end).replace(/\s+/g, " ").trim();
  return context.length > 120 ? context.slice(0, 120) : context;
}

function stripTags(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
