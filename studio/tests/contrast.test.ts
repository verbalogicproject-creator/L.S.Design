import { describe, expect, it } from "vitest";

import { contrastRatio, evaluatePairs, relativeLuminance, resolveRole, toSrgb } from "../shared/contrast.ts";

describe("contrastRatio", () => {
  it("matches the WCAG reference extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    const a = contrastRatio("#2F6F5E", "#FFFFFF");
    const b = contrastRatio("#FFFFFF", "#2F6F5E");
    expect(a).toBeCloseTo(b as number, 10);
  });

  it("reads oklch as well as hex", () => {
    const hex = contrastRatio("#FFFFFF", "#000000");
    const oklch = contrastRatio("oklch(100% 0 0)", "oklch(0% 0 0)");
    expect(oklch).toBeCloseTo(hex as number, 2);
  });

  it("returns null for a value it cannot parse", () => {
    expect(contrastRatio("not-a-colour", "#FFFFFF")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("anchors black and white", () => {
    expect(relativeLuminance(toSrgb("#000000") as [number, number, number])).toBeCloseTo(0, 6);
    expect(relativeLuminance(toSrgb("#FFFFFF") as [number, number, number])).toBeCloseTo(1, 6);
  });
});

describe("evaluatePairs", () => {
  const colors = {
    background: "#F7F5F2",
    content: "#1A1917",
    primary: "#2F6F5E",
    "on-primary": "#FFFFFF",
    "dark-background": "#151412",
    "dark-content": "#F2EFE9",
  };
  const pairs = [
    { foreground: "content", background: "background", target: 4.5 },
    { foreground: "on-primary", background: "primary", target: 4.5 },
  ];

  it("evaluates every pair in both themes", () => {
    const results = evaluatePairs(colors, pairs);
    expect(results.filter((r) => r.theme === "light")).toHaveLength(2);
    expect(results.filter((r) => r.theme === "dark")).toHaveLength(2);
  });

  it("inherits a light value when there is no dark twin", () => {
    expect(resolveRole(colors, "primary", "dark")).toBe("#2F6F5E");
    expect(resolveRole(colors, "background", "dark")).toBe("#151412");
  });

  it("passes the contract's own default palette", () => {
    for (const result of evaluatePairs(colors, pairs)) {
      expect(result.passes, `${result.foreground} on ${result.background} (${result.theme})`).toBe(true);
    }
  });

  it("grades a failing pair", () => {
    const results = evaluatePairs(
      { a: "#777777", b: "#888888" },
      [{ foreground: "a", background: "b", target: 4.5 }],
    );
    expect(results[0]?.passes).toBe(false);
    expect(results[0]?.level).toBe("fail");
  });
});
