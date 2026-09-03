import { StudioError } from "./schema.ts";
import { stableHash } from "./hash.ts";
import { toSrgb } from "./contrast.ts";

export const DARK_PREFIX = "dark-";
export const VAR_PREFIX = "--ls-";

/** The public design.md frontmatter, as parsed. Unknown keys are preserved. */
export interface DesignFrontmatter {
  name: string;
  description?: string;
  version?: string;
  omitted?: unknown;
  colors?: Record<string, string>;
  typography?: Record<string, TypographyRole>;
  rounded?: Record<string, string>;
  spacing?: Record<string, string>;
  components?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export interface TypographyRole {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
  fontFeature?: string;
  fontVariation?: string;
  [key: string]: unknown;
}

export interface TokenModel {
  name: string;
  description: string | undefined;
  colorsLight: Record<string, string>;
  colorsDark: Record<string, string>;
  typography: Record<string, TypographyRole>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  components: Record<string, Record<string, string>>;
}

const REFERENCE_RE = /^\{(colors|rounded|spacing|typography)\.([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?\}$/;

/* ----------------------------------------------------------------- parsing */

export function buildTokenModel(frontmatter: DesignFrontmatter): TokenModel {
  if (!frontmatter || typeof frontmatter.name !== "string" || frontmatter.name.trim() === "") {
    throw new StudioError("E_TOKENS_INVALID", "design.md frontmatter requires a non-empty name");
  }
  const colors = asStringMap(frontmatter.colors, "colors");
  const colorsLight: Record<string, string> = {};
  const colorsDark: Record<string, string> = {};

  for (const [key, value] of Object.entries(colors)) {
    if (key.startsWith(DARK_PREFIX)) colorsDark[key.slice(DARK_PREFIX.length)] = value;
    else colorsLight[key] = value;
  }
  for (const [role, value] of Object.entries(colorsLight)) {
    if (toSrgb(value) === null) {
      throw new StudioError("E_TOKENS_INVALID", `colors.${role} is not a valid CSS color`, { role, value });
    }
  }
  for (const [role, value] of Object.entries(colorsDark)) {
    if (!(role in colorsLight)) {
      throw new StudioError(
        "E_TOKENS_INVALID",
        `colors.${DARK_PREFIX}${role} has no light counterpart`,
        { role },
      );
    }
    if (toSrgb(value) === null) {
      throw new StudioError("E_TOKENS_INVALID", `colors.${DARK_PREFIX}${role} is not a valid CSS color`, {
        role,
        value,
      });
    }
  }

  const typography: Record<string, TypographyRole> = {};
  for (const [role, value] of Object.entries(frontmatter.typography ?? {})) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new StudioError("E_TOKENS_INVALID", `typography.${role} must be an object`, { role });
    }
    typography[role] = value as TypographyRole;
  }

  const components: Record<string, Record<string, string>> = {};
  for (const [component, value] of Object.entries(frontmatter.components ?? {})) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new StudioError("E_TOKENS_INVALID", `components.${component} must be an object`, { component });
    }
    components[component] = asStringMap(value as Record<string, unknown>, `components.${component}`);
  }

  return {
    name: frontmatter.name,
    description: typeof frontmatter.description === "string" ? frontmatter.description : undefined,
    colorsLight,
    colorsDark,
    typography,
    rounded: asStringMap(frontmatter.rounded, "rounded"),
    spacing: asStringMap(frontmatter.spacing, "spacing"),
    components,
  };
}

function asStringMap(value: unknown, label: string): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new StudioError("E_TOKENS_INVALID", `${label} must be a mapping`);
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "object") {
      throw new StudioError("E_TOKENS_INVALID", `${label}.${key} must be a scalar value`, { key });
    }
    out[key] = String(raw);
  }
  return out;
}

export function tokensHash(model: TokenModel): string {
  return stableHash({
    colorsLight: model.colorsLight,
    colorsDark: model.colorsDark,
    typography: model.typography,
    rounded: model.rounded,
    spacing: model.spacing,
    components: model.components,
  });
}

/* --------------------------------------------------------------- var names */

export function colorVar(role: string): string { return `${VAR_PREFIX}color-${role}`; }
export function radiusVar(step: string): string { return `${VAR_PREFIX}radius-${step}`; }
export function spaceVar(step: string): string { return `${VAR_PREFIX}space-${step}`; }
export function typographyVar(kind: string, role: string): string { return `${VAR_PREFIX}${kind}-${role}`; }
export function componentVar(component: string, property: string): string {
  return `${VAR_PREFIX}${component}-${kebab(property)}`;
}

function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
}

const TYPOGRAPHY_VARS: Array<[keyof TypographyRole, string]> = [
  ["fontFamily", "font"],
  ["fontSize", "text"],
  ["fontWeight", "weight"],
  ["lineHeight", "leading"],
  ["letterSpacing", "tracking"],
  ["fontFeature", "font-feature"],
  ["fontVariation", "font-variation"],
];

/** Resolves a `{colors.x}` style reference to a `var(--ls-...)` expression. */
export function resolveReference(value: string): string {
  const match = REFERENCE_RE.exec(value.trim());
  if (!match) return value;
  const [, group, key, sub] = match;
  if (group === "colors" && key) return `var(${colorVar(key)})`;
  if (group === "rounded" && key) return `var(${radiusVar(key)})`;
  if (group === "spacing" && key) return `var(${spaceVar(key)})`;
  if (group === "typography" && key && sub) {
    const kind = TYPOGRAPHY_VARS.find(([property]) => property === sub);
    if (kind) return `var(${typographyVar(kind[1], key)})`;
  }
  return value;
}

/* ---------------------------------------------------------------- emitters */

export function emitTokensCss(model: TokenModel, options: { banner?: string } = {}): string {
  const lines: string[] = [];
  const banner = options.banner ?? defaultBanner(model.name);
  lines.push(banner, "");
  lines.push(":root {", "  color-scheme: light;");

  if (Object.keys(model.colorsLight).length) {
    lines.push("", "  /* Color */");
    for (const [role, value] of Object.entries(model.colorsLight)) {
      lines.push(`  ${colorVar(role)}: ${value};`);
    }
  }

  if (Object.keys(model.typography).length) {
    lines.push("", "  /* Typography */");
    for (const [role, spec] of Object.entries(model.typography)) {
      for (const [property, kind] of TYPOGRAPHY_VARS) {
        const value = spec[property];
        if (value === undefined || value === null || value === "") continue;
        lines.push(`  ${typographyVar(kind, role)}: ${String(value)};`);
      }
    }
  }

  if (Object.keys(model.spacing).length) {
    lines.push("", "  /* Spacing */");
    for (const [step, value] of Object.entries(model.spacing)) {
      lines.push(`  ${spaceVar(step)}: ${value};`);
    }
  }

  if (Object.keys(model.rounded).length) {
    lines.push("", "  /* Radii */");
    for (const [step, value] of Object.entries(model.rounded)) {
      lines.push(`  ${radiusVar(step)}: ${value};`);
    }
  }

  if (Object.keys(model.components).length) {
    lines.push("", "  /* Component tokens */");
    for (const [component, properties] of Object.entries(model.components)) {
      for (const [property, value] of Object.entries(properties)) {
        lines.push(`  ${componentVar(component, property)}: ${resolveReference(value)};`);
      }
    }
  }
  lines.push("}");

  if (Object.keys(model.colorsDark).length) {
    const darkBody = Object.entries(model.colorsDark).map(
      ([role, value]) => `    ${colorVar(role)}: ${value};`,
    );
    lines.push(
      "",
      "@media (prefers-color-scheme: dark) {",
      '  :root:not([data-theme="light"]) {',
      "    color-scheme: dark;",
      ...darkBody,
      "  }",
      "}",
      "",
      ':root[data-theme="dark"] {',
      "  color-scheme: dark;",
      ...darkBody.map((line) => line.slice(2)),
      "}",
    );
  }

  lines.push("");
  return lines.join("\n");
}

export function emitTailwindThemeCss(model: TokenModel): string {
  const lines: string[] = [
    "/* Generated by ls-design-studio. Bridges the design contract into the framework theme. */",
    '@import "tailwindcss";',
    '@import "./tokens.css";',
    "",
    "@theme inline {",
  ];
  for (const role of Object.keys(model.colorsLight)) {
    lines.push(`  --color-${role}: var(${colorVar(role)});`);
  }
  for (const role of Object.keys(model.typography)) {
    if (model.typography[role]?.fontFamily) {
      lines.push(`  --font-${role}: var(${typographyVar("font", role)});`);
    }
  }
  for (const step of Object.keys(model.rounded)) {
    lines.push(`  --radius-${step}: var(${radiusVar(step)});`);
  }
  for (const step of Object.keys(model.spacing)) {
    lines.push(`  --spacing-${step}: var(${spaceVar(step)});`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

/**
 * The frontmatter as an external generator should see it: `dark-` twins removed,
 * because the public design.md format has no place for a second theme.
 */
export function stripDarkTokens(frontmatter: DesignFrontmatter): DesignFrontmatter {
  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(frontmatter.colors ?? {})) {
    if (!key.startsWith(DARK_PREFIX)) colors[key] = value;
  }
  const next: DesignFrontmatter = { ...frontmatter };
  if (Object.keys(colors).length) next.colors = colors;
  else delete next.colors;
  return next;
}

function defaultBanner(name: string): string {
  return [
    "/*",
    `  tokens.css — design tokens for ${name}`,
    "  Generated by ls-design-studio from the frontmatter of design/DESIGN.md.",
    "  Regenerate rather than hand-edit: the next token change discards local edits.",
    "  Logical CSS properties only; a physical property needs a physical-ok note.",
    "*/",
  ].join("\n");
}
