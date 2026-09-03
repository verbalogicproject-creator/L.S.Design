import { converter, parse } from "culori";
import type { ContrastPair } from "./schema.ts";

const toRgb = converter("rgb");

export interface ContrastResult extends ContrastPair {
  theme: "light" | "dark";
  foregroundValue: string;
  backgroundValue: string;
  ratio: number;
  passes: boolean;
  level: "AAA" | "AA" | "AA-large" | "fail";
}

/** Parses any CSS color culori understands (hex, rgb, hsl, oklch, lab, ...). */
export function toSrgb(value: string): [number, number, number] | null {
  const parsed = parse(value.trim());
  if (!parsed) return null;
  const rgb = toRgb(parsed);
  if (!rgb) return null;
  return [clamp01(rgb.r), clamp01(rgb.g), clamp01(rgb.b)];
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function channel(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: [number, number, number]): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** WCAG 2.x contrast ratio, 1.0 to 21.0. */
export function contrastRatio(foreground: string, background: string): number | null {
  const fg = toSrgb(foreground);
  const bg = toSrgb(background);
  if (!fg || !bg) return null;
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  const lighter = Math.max(lf, lb);
  const darker = Math.min(lf, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function level(ratio: number): ContrastResult["level"] {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/**
 * Evaluates every declared pair in both themes. A role with no `dark-` twin
 * inherits its light value, which is what the token convention promises.
 */
export function evaluatePairs(
  colors: Record<string, string>,
  pairs: ContrastPair[],
): ContrastResult[] {
  const results: ContrastResult[] = [];
  for (const theme of ["light", "dark"] as const) {
    for (const pair of pairs) {
      const fgValue = resolveRole(colors, pair.foreground, theme);
      const bgValue = resolveRole(colors, pair.background, theme);
      if (fgValue === undefined || bgValue === undefined) continue;
      const ratio = contrastRatio(fgValue, bgValue);
      if (ratio === null) continue;
      const rounded = Math.round(ratio * 100) / 100;
      results.push({
        ...pair,
        theme,
        foregroundValue: fgValue,
        backgroundValue: bgValue,
        ratio: rounded,
        passes: rounded + 1e-9 >= pair.target,
        level: level(rounded),
      });
    }
  }
  return results;
}

export function resolveRole(
  colors: Record<string, string>,
  role: string,
  theme: "light" | "dark",
): string | undefined {
  if (theme === "dark") {
    const twin = colors[`dark-${role}`];
    if (twin !== undefined) return twin;
  }
  return colors[role];
}
