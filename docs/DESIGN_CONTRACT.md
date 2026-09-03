# The design contract

`design/DESIGN.md` is the one artifact every skill in L.S.Design reads before it builds an
interface. This document explains what it is, why it stays portable, how its companion files are
derived, and what makes a contract worth trusting.

`ls-design-contract` writes it. Every other skill consumes it. See
[`skills/ls-design-contract/SKILL.md`](../skills/ls-design-contract/SKILL.md) for the working
method, and [`skills/ls-design/references/design-contract.md`](../skills/ls-design/references/design-contract.md)
for the consumption rule that binds every skill in the suite.

## Why the artifact is portable

`DESIGN.md` is a valid public design.md document: YAML frontmatter of tokens, followed by prose.
Only `name` is required in the frontmatter; `description`, `colors`, `typography`, `rounded`,
`spacing`, and `components` are optional and follow the public format's shape. The file carries no
suite-specific stamp — no revision history, no approval state, no screen list. That is what lets
any tool that understands the public design.md format read `DESIGN.md` on its own terms, without
knowing L.S.Design exists.

Everything the suite needs beyond the public format — screens, decisions, requests, the gate,
provenance hashes — lives in `design/design.json` instead. `design.json` is owned and written by
the studio server; skills read it only to learn what a person actually approved.

| File | Owner | Contains | Read by |
|---|---|---|---|
| `design/DESIGN.md` | `ls-design-contract`, and a person editing tokens in the studio | Tokens plus prose: premise, direction, layouts, components, content schemas, acceptance criteria | Every skill in the suite, and any external tool that reads the public design.md format |
| `design/design.json` | the studio's HTTP server (the single writer) | Screens, revisions, decisions, requests, the gate, provenance hashes | The studio's own interface; skills read it only to learn what was approved |

## The frontmatter, field by field

```yaml
---
name: "Orbit One"
description: "A compact tabletop speaker, sculptural and quiet."
version: "1.0"
colors:
  background: "#F7F5F2"
  surface: "#FFFFFF"
  content: "#1A1917"
  content-muted: "#5C574F"
  border: "#E2DED6"
  border-strong: "#948D82"
  primary: "#2F6F5E"
  on-primary: "#FFFFFF"
  accent: "#A0552A"
  on-accent: "#FFFFFF"
  focus: "#2F6F5E"
  dark-background: "#151412"
  dark-surface: "#1F1E1B"
  dark-content: "#F2EFE9"
  dark-primary: "#6FBFA5"
  dark-on-primary: "#10201B"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "0.25rem"
  md: "0.625rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  md: "1.5rem"
  xl: "4rem"
components:
  button:
    background: "{colors.primary}"
    color: "{colors.on-primary}"
    borderRadius: "{rounded.full}"
---

## Overview

**Premise.** A single-object product page for people who already searched for a specific,
expensive object and want confirmation, not persuasion.
...
```

- **`name`** is the only required field. It becomes the project name recorded in `design.json` at
  `init` time and the heading of every generated file.
- **`description`** is a one-line summary. The handoff brief falls back to it for the premise
  section when `DESIGN.md`'s Overview does not state one in the `**Premise.**` form.
- **`colors`** is a flat map of semantic role names to CSS color values (hex, `rgb()`, `hsl()`,
  `oklch()` — anything a browser and the `culori` library both parse). Name roles by what they
  mean (`primary`, `danger`, `border-strong`), never what they look like (`green`, `light-grey`):
  a role survives a rebrand, a literal color name does not.
- **`typography`** maps a role name (`display`, `h1`, `body`, `caption`, `mono`, and so on — free
  form, not a fixed list) to a `TypographyRole` object: `fontFamily`, `fontSize`, `fontWeight`,
  `lineHeight`, `letterSpacing`, and the two OpenType fields `fontFeature` and `fontVariation`.
  Every field is optional; only the ones present are emitted into `tokens.css`.
- **`rounded`** and **`spacing`** are flat step-name-to-CSS-length maps (`sm`, `md`, `lg`, `full`
  for radii; whatever step names the spacing rhythm needs).
- **`components`** maps a component name to a map of CSS-property-like keys to values. A value can
  reference another token group with `{colors.x}`, `{rounded.x}`, or `{spacing.x}` — the studio
  resolves the reference to a `var(--ls-...)` expression when it generates `tokens.css`, so a
  later token edit propagates without touching the component entry.
- **`version`** is a free-form string the contract may set for its own tracking; the suite does
  not read it.
- Any other key in the frontmatter is preserved as-is when the studio rewrites tokens — the
  parser keeps unknown keys rather than discarding them, but only the keys above are covered by
  L.S.Design's own tooling.

## The `dark-` convention

Dark mode fits inside the same flat `colors` map through a `dark-` prefix: `dark-surface` is the
dark twin of `surface`. A color role with no `dark-` twin inherits its light value when the
document renders in a dark theme — nothing needs to be duplicated for a role whose dark and light
values are meant to be the same. This is a deliberate constraint, not a limitation of the format:
a `colors` map with a nested `light`/`dark` structure would no longer be a flat map, and the public
design.md format has no place for that structure.

`ls-design-studio tokens --project . --emit stitch` produces the frontmatter as an external
screen generator should see it: every `dark-`-prefixed key removed, because a generator such as
Google Stitch has no concept of a dark twin and would otherwise treat `dark-primary` as an
unrelated color role named literally "dark-primary." `DESIGN.md` itself is never touched by this
command — it only changes what gets emitted to standard output for upload to the generator.

## What is derived, and why it is never hand-edited

From the frontmatter, the studio generates three files:

- **`design/tokens.css`** — one `--ls-` prefixed custom property per token, using only logical CSS
  properties. Colors declared under `dark-` render inside a `prefers-color-scheme: dark` media
  query and an explicit `[data-theme="dark"]` block, so a project can either follow the system
  preference or let a person toggle it.
- **`design/tailwind.theme.css`** — a Tailwind v4 `@theme inline` bridge that maps `--color-*`,
  `--font-*`, `--radius-*`, and `--spacing-*` to the `--ls-*` custom properties, so Tailwind's
  utility classes resolve to the contract's values instead of Tailwind's own defaults.
- **`design/preview.html`** — a single self-contained HTML file, with no remote script source,
  that inlines the current tokens and contrast pairs so it opens correctly from the filesystem
  with no server.

All three are regenerated from the frontmatter every time tokens change — through
`ls-design-contract`'s working method, through a token edit made in the studio's browser
interface, or through `ls-design-studio tokens --emit css` / `--emit tailwind` on the command
line. None of the three should ever be edited by hand: the next regeneration silently discards a
hand edit, because the generator has no way to know it was made and no reason to preserve it.

## `design.json` versus `DESIGN.md`

`DESIGN.md` is the design: the tokens and the prose that explains the premise, direction, layout,
components, content, and acceptance criteria behind them. `design.json` is process state: which
screens exist, which revision of each is current, whether a person approved or rejected it and
with what note, which generation requests are queued, whether the gate can pass, and a sha256 of
each generated file at the moment it was last written. A skill that wants to know "is this project
under contract" reads `DESIGN.md`. A skill that wants to know "did a person actually approve this
screen" reads `design.json` through the studio's status endpoint or MCP tools — never by parsing
the file directly while a studio server owns the project, since the server is the file's only
writer.

## The consumption rule

Before any skill in this suite builds a new interface:

1. Check whether `design/DESIGN.md` exists.
2. If it exists, obey it — read the frontmatter for tokens and the prose for intent. A needed
   departure is a governed contract change, not a local override in one component.
3. If it does not exist and the work is new build work, run `ls-design-contract` first. If the
   user explicitly declines, state a one-sentence premise and a minimal inline token set, and say
   plainly that they are provisional and not visually confirmed.
4. If `design/handoff/` exists, build from the frozen snapshot inside it rather than from the live
   `design/` folder, which may already contain edits nobody has approved yet.
5. Audit-only and review-only work (`ls-design-redesign` in audit mode, `ls-design-review`) never
   creates a contract. It may recommend that one be created.

## The preview's verification protocol

`design/preview.html` recomputes every contrast ratio in the browser, measures horizontal overflow
at 360, 768, and 1440 pixels, and reports the count of Unicode bidirectional control characters in
its own rendered text — which must be zero. A contract's status field means nothing until this
file has actually been opened and checked: confirm the layout in the project's reading direction,
confirm every contrast row passes, confirm zero overflow at all three widths, confirm both themes
are correct (not merely legible — intentional), confirm the self-check panel reports zero bidi
control characters and zero unjustified physical directional properties, then disable the font
link and confirm the fallback stack still holds the design together. Record the outcome — who
checked, when, at which widths and themes, and whether it was an actual render or a handoff to the
user for confirmation — in the contract's approval log. A contract whose preview was never opened
is a draft, whatever its status field says. The full required-sections list and step-by-step
protocol live in
[`skills/ls-design-contract/references/preview-artifact.md`](../skills/ls-design-contract/references/preview-artifact.md).

## Writing a good contract

**Premise evidence.** A one-sentence premise is only as strong as what it rests on. Name the
brand asset, the existing content, or the actual conversation with the user that the premise is
drawn from. A premise invented to sound plausible is exactly the kind of guess the contract exists
to replace.

**Semantic role naming.** Every color, spacing step, and radius is named for the job it does, not
for what it currently looks like. `primary` and `danger` survive a rebrand and a dark-mode pass
without becoming lies; `green` and `red` do not — the day `danger` needs to render as a warm
orange for contrast reasons, a token named `red` is already wrong.

**`border` versus `border-strong`.** These are two roles on purpose, not a naming accident. A
decorative hairline between two adjacent surfaces is meant to be deliberately subtle — forcing it
to a 3:1 ratio makes it read as a heavy rule where none was intended. The boundary of an
interactive control (an input's outline, a button's edge) is where WCAG 1.4.11 non-text contrast
actually applies, and that is the role that gets verified at 3:1. The default palette shipped with
the contract template declares seven contrast pairs and verifies each of them in both the light
and dark theme — fourteen checks in total — and `border-strong` against `surface` is one of the
two pairs held to the 3:1 interface-component threshold rather than the 4.5:1 body-text threshold.
Collapsing the two roles into one is the most common way a palette that "looks fine" fails its own
contrast check the moment someone actually verifies it.
