import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { lintBuildSource, normaliseCssValue, readContractTokens } from "../server/lint-build.ts";
import { initProject } from "../server/init.ts";

let root = "";
let src = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ls-lint-build-"));
  src = join(root, "src", "components");
  await mkdir(src, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const CLEAN = `interface CardProps {
  readonly title: string;
}

export function Card({ title }: CardProps): React.JSX.Element {
  return (
    <section id="card" className="bg-surface text-content">
      <h2>{title}</h2>
      <a href="#card">anchor</a>
    </section>
  );
}
`;

describe("build source lint", () => {
  it("passes an implementation that uses only contract tokens", async () => {
    await writeFile(join(src, "Card.tsx"), CLEAN);
    const result = await lintBuildSource({ projectRoot: root });
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("catches a colour literal, with the file and line", async () => {
    await writeFile(join(src, "Card.tsx"), CLEAN.replace('className="bg-surface', 'style={{ color: "#ff0000" }} className="'));
    const result = await lintBuildSource({ projectRoot: root });
    const finding = result.findings.find((f) => f.rule === "hex-color-literal");
    expect(finding).toBeDefined();
    expect(finding?.file).toContain("Card.tsx");
    expect(finding?.line).toBeGreaterThan(0);
    expect(result.ok).toBe(false);
  });

  it("catches a placeholder anchor and one that points nowhere", async () => {
    await writeFile(join(src, "Card.tsx"), CLEAN.replace('<a href="#card">anchor</a>', '<a href="#">x</a><a href="#gone">y</a>'));
    const result = await lintBuildSource({ projectRoot: root });
    const rules = result.findings.map((f) => f.rule);
    expect(rules).toContain("placeholder-anchor");
    expect(rules).toContain("dangling-anchor");
    expect(result.ok).toBe(false);
  });

  it("warns, but does not fail, when a component has no named Props type", async () => {
    await writeFile(
      join(src, "Card.tsx"),
      `export function Card({ title }: { readonly title: string }): React.JSX.Element {\n  return <p id="card">{title}</p>;\n}\n`,
    );
    const result = await lintBuildSource({ projectRoot: root });
    expect(result.findings.map((f) => f.rule)).toContain("missing-props-interface");
    expect(result.findings.every((f) => f.severity === "warning")).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("does not flag the contract's own generated files", async () => {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "tokens.css"), ":root { --ls-color-content: #22241F; }\n");
    await writeFile(join(src, "Card.tsx"), CLEAN);
    const result = await lintBuildSource({ projectRoot: root });
    expect(result.findings).toEqual([]);
  });
});

describe("value normalisation", () => {
  it("treats a minifier's output as equal to the contract's text", () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ["#fff", "#FFFFFF"],
      [".5rem", "0.5rem"],
      ["-.02em", "-0.02em"],
      ["9999px", "9999px"],
      ['"Inter", system-ui', "Inter,system-ui"],
    ];
    for (const [minified, contract] of pairs) {
      expect(normaliseCssValue(minified)).toBe(normaliseCssValue(contract));
    }
  });

  it("still separates genuinely different values", () => {
    expect(normaliseCssValue("#fff")).not.toBe(normaliseCssValue("#eee"));
    expect(normaliseCssValue("0.5rem")).not.toBe(normaliseCssValue("0.6rem"));
  });
});

describe("contract token reading", () => {
  it("reads the light theme map from a project's tokens.css", async () => {
    await initProject({ projectRoot: root, name: "Lint Fixture" });
    const tokens = await readContractTokens(root);
    expect(tokens.size).toBeGreaterThan(20);
    expect(tokens.get("--ls-color-background")).toBeDefined();
    // The dark twins live in a later block and must not leak into the map.
    expect([...tokens.keys()].some((key) => key.includes("dark"))).toBe(false);
  });
});
