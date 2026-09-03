import { parseDesignMd } from "../design-md.ts";

import type { DesignState } from "../../shared/schema.ts";

export interface BriefInput {
  state: DesignState;
  designMd: string;
  targetStack: Record<string, unknown>;
  fixtureCounts: Record<string, number>;
  online: boolean;
  gatePassed: boolean;
}

const GATE_NOT_PASSED_LINE =
  "> GATE NOT PASSED — this handoff is provisional and must not be treated as approved.";

/** Renders the handoff BRIEF.md that a builder reads before touching any code. */
export function renderBrief(input: BriefInput): string {
  const sections = [
    renderPremise(input),
    renderTargetStack(input.targetStack),
    renderScreens(input.state),
    renderTokenRules(),
    renderFixtureQuarantine(input.fixtureCounts),
    renderOfflineNote(input.online, input.state),
    renderBuildRoute(input.targetStack),
    renderProvenance(input.state),
  ];

  const lines: string[] = [];
  if (!input.gatePassed) {
    lines.push(GATE_NOT_PASSED_LINE, "");
  }
  lines.push(`# Handoff brief — ${input.state.project.name}`, "");
  lines.push(sections.join("\n\n"));
  lines.push("");
  return lines.join("\n");
}

function renderPremise(input: BriefInput): string {
  return ["## 1. Premise", "", extractPremise(input.designMd)].join("\n");
}

function extractPremise(designMd: string): string {
  const overview = extractSection(designMd, "Overview");
  if (overview) {
    const match = /\*\*Premise\.\*\*\s*(.+)/.exec(overview);
    const line = match?.[1]?.split("\n")[0]?.trim();
    if (line) return line;
  }
  try {
    const { frontmatter } = parseDesignMd(designMd);
    if (typeof frontmatter.description === "string" && frontmatter.description.trim() !== "") {
      return frontmatter.description.trim();
    }
  } catch {
    /* fall through to the default below */
  }
  return "Not recorded in the contract.";
}

function extractSection(markdown: string, heading: string): string | null {
  const headingRe = new RegExp(`^##\\s+${heading}\\s*$`, "m");
  const match = headingRe.exec(markdown);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const nextHeading = /^##\s+/m.exec(rest);
  return nextHeading ? rest.slice(0, nextHeading.index) : rest;
}

function renderTargetStack(targetStack: Record<string, unknown>): string {
  const rows = Object.entries(targetStack).map(([key, value]) => `| ${key} | ${stringifyCell(value)} |`);
  return [
    "## 2. Target stack",
    "",
    "| Key | Value |",
    "| --- | --- |",
    ...rows,
  ].join("\n");
}

function renderScreens(state: DesignState): string {
  const approved = state.screens.filter((screen) => screen.decision.state === "approved");
  const header = [
    "## 3. Screens",
    "",
    "| Slug | Title | Device | Size | Revision | Source |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  if (approved.length === 0) {
    return [...header, "| _none_ | | | | | |"].join("\n");
  }
  const rows = approved.map(
    (screen) =>
      `| ${screen.slug} | ${screen.title} | ${screen.device} | ${screen.width}x${screen.height} | ${screen.revision} | ${screen.source.kind} |`,
  );
  return [...header, ...rows].join("\n");
}

function renderTokenRules(): string {
  return [
    "## 4. Token rules",
    "",
    "**The contract is law.**",
    "",
    "- Every colour, size, radius and font comes from the `--ls-*` custom properties or the framework theme.",
    "- A needed value the contract lacks is a contract change, not a local literal.",
    "- Component variants and states are the ones the contract lists.",
  ].join("\n");
}

function renderFixtureQuarantine(fixtureCounts: Record<string, number>): string {
  const entries = Object.entries(fixtureCounts);
  const allZero = entries.length === 0 || entries.every(([, count]) => count === 0);
  const lines = ["## 5. Fixture quarantine", ""];
  if (allZero) {
    lines.push("No fixture values were detected.");
  } else {
    lines.push("| Slug | Quarantined values |", "| --- | --- |");
    for (const [slug, count] of entries) {
      lines.push(`| ${slug} | ${count} |`);
    }
    lines.push(
      "",
      "These are detected candidates, not a verdict. The detector cannot tell an invented " +
        "number from a real one, so confirm each against the product facts in section 1: keep " +
        "what the brief establishes, and replace what the generator made up. No unconfirmed " +
        "value ships.",
    );
  }
  return lines.join("\n");
}

function renderOfflineNote(online: boolean, state: DesignState): string {
  const approved = state.screens.filter((screen) => screen.decision.state === "approved");
  const allTokenDriven = approved.length > 0 && approved.every((screen) => screen.tokenDriven);
  const lines = ["## 6. Offline note", ""];
  if (allTokenDriven) {
    /*
      Every approved screen renders from this handoff's own tokens.css and
      fonts, so the HTML is the record and it paints with no network at all.
    */
    lines.push(
      "Every approved screen is token-driven: `code.html` renders from the `tokens.css` and " +
        "`fonts/` in this handoff and needs no network. The HTML is the record; `screen.png` is " +
        "a capture of it under the tokens named in section 8.",
    );
  } else {
    lines.push(
      "`screen.png` is the visual record of record. A baked screen's HTML may require a network " +
        "connection for its CDN scripts, fonts and images.",
    );
  }
  lines.push(`The network was ${online ? "reachable" : "not reachable"} at export time.`);
  return lines.join("\n");
}

function renderBuildRoute(targetStack: Record<string, unknown>): string {
  const routerSkill = typeof targetStack.routerSkill === "string" ? targetStack.routerSkill : "the router skill";
  return [
    "## 7. Build route",
    "",
    "Read this brief first, then route the build through " + `\`${routerSkill}\`` + ".",
    "Finish with a screenshot pass at 360/768/1440 and a closing `ls-design-review` pass.",
  ].join("\n");
}

function renderProvenance(state: DesignState): string {
  const provenance = state.provenance ?? {};
  const line = (label: string, key: string): string =>
    `- ${label}: \`${provenance[key] ?? "not recorded"}\``;
  return [
    "## 8. Provenance",
    "",
    line("DESIGN.md sha256", "DESIGN.md"),
    line("tokens.css sha256", "tokens.css"),
    line("preview.html sha256", "preview.html"),
    `- Tokens hash: \`${state.tokensHash || "not recorded"}\``,
    `- Revision: ${state.rev}`,
    `- Exported at: ${new Date().toISOString()}`,
  ].join("\n");
}

function stringifyCell(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}
