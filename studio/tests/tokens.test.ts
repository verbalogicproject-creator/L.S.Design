import { describe, expect, it } from "vitest";

import {
  buildTokenModel,
  emitTailwindThemeCss,
  emitTokensCss,
  resolveReference,
  stripDarkTokens,
  tokensHash,
  type DesignFrontmatter,
} from "../shared/tokens.ts";
import { StudioError } from "../shared/schema.ts";

const frontmatter: DesignFrontmatter = {
  name: "Orbit One",
  description: "A compact tabletop speaker.",
  colors: {
    background: "#F7F5F2",
    surface: "#FFFFFF",
    content: "#1A1917",
    primary: "#2F6F5E",
    "on-primary": "#FFFFFF",
    "dark-background": "#151412",
    "dark-primary": "#6FBFA5",
  },
  typography: {
    display: { fontFamily: "Fraunces, serif", fontSize: "3rem", fontWeight: 600, lineHeight: 1.05 },
    body: { fontFamily: "Inter, sans-serif", fontSize: "1.0625rem", lineHeight: 1.6 },
  },
  rounded: { md: "0.625rem", full: "9999px" },
  spacing: { sm: "1rem", lg: "2.5rem" },
  components: {
    button: { background: "{colors.primary}", color: "{colors.on-primary}", borderRadius: "{rounded.full}" },
  },
};

describe("token model", () => {
  it("splits light and dark by the dark- prefix", () => {
    const model = buildTokenModel(frontmatter);
    expect(Object.keys(model.colorsLight).sort()).toEqual([
      "background",
      "content",
      "on-primary",
      "primary",
      "surface",
    ]);
    expect(model.colorsDark).toEqual({ background: "#151412", primary: "#6FBFA5" });
  });

  it("rejects a dark token with no light counterpart", () => {
    expect(() =>
      buildTokenModel({ ...frontmatter, colors: { ...frontmatter.colors, "dark-orphan": "#000000" } }),
    ).toThrowError(StudioError);
  });

  it("rejects a colour value it cannot parse", () => {
    expect(() =>
      buildTokenModel({ ...frontmatter, colors: { ...frontmatter.colors, broken: "not-a-colour" } }),
    ).toThrowError(/not a valid CSS color/);
  });

  it("requires a name", () => {
    expect(() => buildTokenModel({ ...frontmatter, name: "" })).toThrowError(/non-empty name/);
  });

  it("hashes independently of key order", () => {
    const reordered: DesignFrontmatter = {
      ...frontmatter,
      colors: Object.fromEntries(Object.entries(frontmatter.colors ?? {}).reverse()),
    };
    expect(tokensHash(buildTokenModel(reordered))).toBe(tokensHash(buildTokenModel(frontmatter)));
  });
});

describe("resolveReference", () => {
  it("maps every reference group to its custom property", () => {
    expect(resolveReference("{colors.primary}")).toBe("var(--ls-color-primary)");
    expect(resolveReference("{rounded.full}")).toBe("var(--ls-radius-full)");
    expect(resolveReference("{spacing.lg}")).toBe("var(--ls-space-lg)");
    expect(resolveReference("{typography.body.fontSize}")).toBe("var(--ls-text-body)");
  });

  it("passes a literal through untouched", () => {
    expect(resolveReference("1.5rem")).toBe("1.5rem");
  });
});

describe("emitters", () => {
  const model = buildTokenModel(frontmatter);
  const css = emitTokensCss(model);

  it("writes light roles under :root", () => {
    expect(css).toContain("--ls-color-background: #F7F5F2;");
    expect(css).toContain("--ls-text-display: 3rem;");
    expect(css).toContain("--ls-space-lg: 2.5rem;");
    expect(css).toContain("--ls-radius-full: 9999px;");
  });

  it("resolves component references to custom properties", () => {
    expect(css).toContain("--ls-button-background: var(--ls-color-primary);");
    expect(css).toContain("--ls-button-border-radius: var(--ls-radius-full);");
  });

  it("emits both dark selectors and only the roles that have twins", () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]');
    const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"]'));
    expect(darkBlock).toContain("--ls-color-primary: #6FBFA5;");
    // A role with no dark twin inherits its light value; it must not be repeated.
    expect(darkBlock).not.toContain("--ls-color-surface");
  });

  it("uses only logical properties and no framework namespace", () => {
    expect(css).not.toMatch(/margin-left|padding-right|(^|[^-])left:/m);
    expect(css).not.toContain("--color-");
  });

  it("bridges into the framework theme", () => {
    const theme = emitTailwindThemeCss(model);
    expect(theme).toContain('@import "tailwindcss";');
    expect(theme).toContain('@import "./tokens.css";');
    expect(theme).toContain("@theme inline {");
    expect(theme).toContain("--color-primary: var(--ls-color-primary);");
    expect(theme).toContain("--font-display: var(--ls-font-display);");
    expect(theme).toContain("--spacing-lg: var(--ls-space-lg);");
  });
});

describe("stripDarkTokens", () => {
  it("removes every dark- twin so an external generator sees a clean document", () => {
    const stripped = stripDarkTokens(frontmatter);
    expect(Object.keys(stripped.colors ?? {})).not.toContain("dark-background");
    expect(Object.keys(stripped.colors ?? {})).toContain("background");
    expect(stripped.typography).toEqual(frontmatter.typography);
  });

  it("does not mutate the input", () => {
    const before = JSON.stringify(frontmatter);
    stripDarkTokens(frontmatter);
    expect(JSON.stringify(frontmatter)).toBe(before);
  });
});

describe("the shipped default palette", () => {
  it("passes every default contrast pair in both themes", async () => {
    const { readFile } = await import("node:fs/promises");
    const { parseDesignMd } = await import("../server/design-md.ts");
    const { fillTemplate } = await import("../server/init.ts");
    const { evaluatePairs } = await import("../shared/contrast.ts");
    const { DEFAULT_CONTRAST_PAIRS } = await import("../server/store.ts");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");

    const here = dirname(fileURLToPath(import.meta.url));
    const raw = await readFile(resolve(here, "..", "templates", "DESIGN.template.md"), "utf8");
    const document = parseDesignMd(fillTemplate(raw, { project_name: "Check", project_description: "Check." }));
    const model = buildTokenModel(document.frontmatter);

    const colors: Record<string, string> = { ...model.colorsLight };
    for (const [role, value] of Object.entries(model.colorsDark)) colors[`dark-${role}`] = value;

    const results = evaluatePairs(colors, DEFAULT_CONTRAST_PAIRS);
    expect(results.length).toBe(DEFAULT_CONTRAST_PAIRS.length * 2);
    const failures = results.filter((row) => !row.passes);
    expect(
      failures.map((row) => `${row.foreground} on ${row.background} (${row.theme}) ${row.ratio}:1`),
    ).toEqual([]);
  });
});

describe("preview overview extraction", () => {
  it("reads premise, direction, counterpoint, and signature out of the contract prose", async () => {
    const { readOverview } = await import("../server/preview.ts");
    const body = [
      "\n# Orbit One\n",
      "## Overview\n",
      "**Premise.** A quiet, well-made object rather than a technology launch.\n",
      "**Evidence.** The supplied product facts.\n",
      "**Direction.** Primary family: material study. Quiet counterpoint: a serif display face. Signature element: the woven acoustic fabric.\n",
      "## Colors\n",
      "Roles carry meaning.\n",
    ].join("\n");
    const overview = readOverview(body);
    expect(overview.premise).toBe("A quiet, well-made object rather than a technology launch.");
    expect(overview.direction).toBe("material study");
    expect(overview.counterpoint).toBe("a serif display face");
    expect(overview.signature).toBe("the woven acoustic fabric");
  });

  it("returns nothing rather than guessing when the section is absent", async () => {
    const { readOverview } = await import("../server/preview.ts");
    const overview = readOverview("\n# Title\n\n## Colors\n\nNo overview here.\n");
    expect(overview.premise).toBeUndefined();
    expect(overview.direction).toBeUndefined();
  });
});
