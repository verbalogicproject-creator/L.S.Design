# Design contract

Use this reference to know when to create, update, or consume `design/DESIGN.md` — the one artifact in this suite that every other skill commits to reading before it builds an interface. The contract is produced and maintained by `ls-design-contract`; the full field-by-field schema lives in that skill's [contract schema](../../ls-design-contract/references/contract-schema.md).

## The key idea: a contract, not a guess

A design contract is a governed interface between design intent and code implementation, in the same way a design system stops every component from re-guessing its tokens. It is written once, confirmed visually, and then read by every other skill instead of re-inventing direction each time.

Without it, three sessions on the same project produce three slightly different greys, three spacing rhythms, and three focus treatments — each defensible alone, incoherent together. The contract is the mechanism that makes a multi-session, multi-skill project converge.

## Two files, two jobs

| File | Owner | Contains | Read by |
|---|---|---|---|
| `design/DESIGN.md` | designer and `ls-design-contract` | The design itself: YAML frontmatter of tokens plus prose sections (Overview, Colors, Typography, Layout and Spacing, Elevation and Depth, Shapes, Components, Do's and Don'ts) | Every skill, every external design tool that reads the public design.md format |
| `design/design.json` | the studio server | Process state: screens, revisions, decisions, requests, gates, provenance hashes | The studio and its interface; skills read it only to learn what was approved |

`DESIGN.md` stays portable — it carries no suite-specific stamps, so any tool that understands the public design.md format can read it. Everything this suite needs beyond that format lives in `design.json`, never inside `DESIGN.md`.

Generated companions — `design/tokens.css`, `design/tailwind.theme.css`, `design/preview.html` — are derived from the frontmatter. Edit the frontmatter and regenerate; never hand-edit a generated file, because the next regeneration discards the edit.

## The consumption rule (applies to every skill in this suite)

Before building a new interface:

1. Check whether `design/DESIGN.md` exists in the project.
2. **If it exists:** obey it. Read the frontmatter for tokens and the prose for intent. If the implementation needs to depart from the contract, change the contract first through a governed update, not locally in one component.
3. **If it does not exist and this is new build work:** run `ls-design-contract` before continuing. If the user explicitly declines, write a one-sentence premise and a minimal inline token set, and state plainly that they are provisional and not visually confirmed.
4. **If `design/handoff/` exists:** it is the frozen, approved snapshot. Build from it rather than from the live `design/` folder, because the live folder may already contain unapproved edits.
5. **Audit-only and review-only work** (`ls-design-redesign` in audit mode, `ls-design-review`) never creates a contract. It may recommend that one be created, and it should report where a contract exists but is not actually enforced in the code.

## What the contract must cover (summary)

- A one-sentence, evidence-backed **premise**.
- A **direction**: one primary family and one quiet counterpoint.
- **Tokens**: color roles with verified contrast in both light and dark, a typographic scale with roles, spacing, radii, elevation, and motion.
- **Layouts** at page level, with named slots.
- **Components as contracts**: purpose, anatomy, variants, states, keyboard behavior, whether it mirrors under a right-to-left direction, and whether it needs client-side behavior or stays static markup.
- **Content schemas** with explicit fields and provenance, so no skill fabricates a testimonial or a statistic.
- **Directionality rules** when the project ships a right-to-left locale — see [rtl foundations](rtl-foundations.md).
- An **accessibility baseline** and measurable **acceptance criteria**.
- A link to the **preview artifact** and an **approval log**.

## Cost and proportion

A full contract is worth its cost as soon as work spans more than one surface, more than one session, or more than one person. For a single isolated fix inside an existing product that already has tokens, a full contract is overhead — read the existing tokens instead and note that no contract governs the project.

## What happens without one

Work continues under the general guidance in core principles, natural color, and advanced layout. That guidance is good, but it is advice rather than a single source of truth, so token drift between skills stays possible. The contract is what converts advice into a decision that holds.
