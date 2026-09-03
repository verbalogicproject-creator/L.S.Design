---
name: ls-design-contract
description: Create, update, and verify a project's design contract — the design.md-format token frontmatter plus component, layout, content, and accessibility decisions — together with a generated tokens stylesheet and a self-contained HTML preview for visual confirmation. Run this before any other L.S.Design skill builds a new interface.
---

# L.S.Design Contract

Produce and maintain the single source of truth every other skill in this suite consumes: `design/DESIGN.md`, `design/design.json`, `design/tokens.css`, and `design/preview.html` inside the target project. One design decision, written once, obeyed everywhere.

## Decision order

Resolve conflicts in this order: explicit user and repository requirements; product, platform, and established brand truth; accessibility, usability, and functional correctness; the guidance of an already-approved design contract; aesthetic defaults and anti-pattern warnings. An invariant is mandatory, a contextual default is a starting point, and an anti-pattern warning is a diagnostic signal rather than a ban.

## When to run

- Before any new interface build where the project has no approved `design/DESIGN.md`.
- When asked to update, extend, or correct a drift in an existing contract.
- Before opening the design studio, so the studio has tokens to work from.
- **Not** for audit-only or review-only tasks. Those route to `ls-design-redesign` or `ls-design-review`, which may recommend a contract but never create one.

## Working method

1. **Discover state.** Check whether `design/DESIGN.md` exists. If it does, read it in full before changing anything — an update preserves approved decisions unless the user asks for a change. Inspect the repository for real content, existing tokens, brand assets, fonts, supported locales, and target devices. Never invent evidence for a premise.
2. **Premise and direction.** State the design premise in one sentence: audience, intended feeling, and the visual behavior that supports it. Choose one primary direction family and one quiet counterpoint. Name the signature element and the explicit exclusions.
3. **Tokens.** Set semantic color roles, a typographic scale with roles, a spacing rhythm, radii, elevation, and motion. Verify contrast for every foreground-background pair in both light and dark before writing the values down: 4.5:1 for body text, 3:1 for large text and interface components.
4. **Write the files.** When Node is available, `npx ls-design-studio init --project .` writes all four files from the templates and generates the derived ones. Without Node, copy `assets/DESIGN.template.md` to `design/DESIGN.md`, `assets/tokens.template.css` to `design/tokens.css`, `assets/preview.template.html` to `design/preview.html`, and `assets/design.template.json` to `design/design.json`, then substitute the project values by hand. `tokens.css`, `tailwind.theme.css`, and `preview.html` are derived from the frontmatter — regenerate them rather than hand-editing them.
5. **Visual confirmation.** Open `design/preview.html`, check it at 360, 768, and 1440 pixels in both light and dark, and confirm every contrast row passes, no frame overflows horizontally, and the self-check panel reports zero bidirectional control characters. Record the result in the approval log. Mark the contract approved only after a check actually happened — if visual rendering is not available in the environment, hand the file to the user for confirmation and say so explicitly in the log.
6. **Hand off.** Point the user at the next step: `ls-design-studio` to generate and approve screens against these tokens, or the relevant build specialist to implement directly from the approved contract.

## Artifact constraints

- `design/DESIGN.md` is a valid public design.md document: `name` in the frontmatter is required; `description`, `colors`, `typography`, `rounded`, `spacing`, and `components` are optional and follow that format. Keep it free of suite-specific stamps so any tool reading the public format can consume it. Everything this suite needs beyond the format goes in `design/design.json`.
- Dark values live in the same flat `colors` map under a `dark-` prefixed name — `dark-primary` is the dark twin of `primary`. Any token without a twin inherits its light value.
- `design/tokens.css` uses the `--ls-` custom-property prefix and logical CSS properties only. A physical property needs a justified `physical-ok` note on the same line.
- `design/preview.html` is one self-contained HTML file with no remote script source, carrying `lang` and `dir` on the `html` element, and it opens from the filesystem without a server.
- No Unicode bidirectional control character appears in any generated file.
- Content schemas record provenance. A quotation, statistic, award, or customer name without a real source does not go in the contract.

## Screens: token-driven versus baked

A screen shown in the design studio is either token-driven or baked. A token-driven screen is HTML the coding agent authors directly, linking `design/tokens.css` and expressing every color, type, radius, and spacing value as `var(--ls-*)` — no hex or `rgb()`/`hsl()` literal, no remote font, no CDN. Because it renders from the same tokens the contract owns, editing a token repaints it instantly and it never goes stale. A baked screen comes from an external generator, such as Google Stitch: its colors and fonts are resolved to literal values at generation time, so a token edit cannot repaint it — it only marks the screen stale and queues a reapplication.

Author a screen the coding agent generates directly as token-driven. A baked screen remains a valid path when an external generator produced it; `ls-design-studio` keeps it current through the reapply round-trip described there. Read [screen authoring](references/screen-authoring.md) for the full rules a token-driven screen must follow.

Read [contract schema](references/contract-schema.md) for the full field list and the concept mapping across stacks. Read [preview artifact](references/preview-artifact.md) for the required preview sections and the verification protocol.

Read [core principles](../ls-design/references/core-principles.md) when setting a new direction. Read [design contract](../ls-design/references/design-contract.md) for the consumption rule that binds every skill in this suite. Read [rtl foundations](../ls-design/references/rtl-foundations.md) whenever the project ships a right-to-left locale or a locale-portable component library. Read [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) when choosing the palette and checking specificity. Read [advanced layout decisions](../ls-design/references/advanced-layout.md) when defining complex layout templates.
