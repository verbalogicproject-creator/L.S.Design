---
name: ls-design-websites
description: Design or implement premium multi-section websites and responsive page systems. Use for complete marketing, editorial, portfolio, institutional, or product websites rather than a single conversion page.
---

# L.S.Design Websites

Build a coherent website, not a stack of interchangeable sections.

## Decision order

User and repository requirements come first, followed by product and brand truth, accessibility and function, this specialist's guidance, then aesthetic defaults.

## Workflow

1. Inspect content, information architecture, existing routes, components, assets, and implementation constraints.
2. Identify the audience's primary questions and arrange pages and sections to answer them in sequence.
3. Define a visual premise and a small set of layout behaviors that can vary without losing identity.
4. Establish reusable header, footer, navigation, type, spacing, media, surface, and interaction rules.
5. Implement responsive compositions for actual content lengths and states.
6. Render and review representative pages together so local polish does not weaken system coherence.

## Quality bar

- Give each page a distinct purpose while preserving recognizable system behavior.
- Use composition, typography, image direction, and pacing before decorative effects.
- Avoid repeated centered headline-plus-card-grid sections unless the content truly calls for them.
- Use asymmetry only when reading order remains clear.
- Make navigation, contact paths, legal content, and footer information complete.
- Preserve semantic landmarks, heading order, focus visibility, useful link text, and robust zoom behavior.
- Treat mobile as a recomposition. Protect priority content and actions instead of preserving desktop geometry.

For section rhythm, navigation patterns, and responsive completion checks, read [references/website-craft.md](references/website-craft.md).

Read [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) when establishing the visual world or checking whether repeated sections feel generated. Read [advanced layout decisions](../ls-design/references/advanced-layout.md) for complex editorial composition, galleries, overlays, or a proposed layout dependency.

Before building a new interface, check for `design/DESIGN.md` and obey it if present; if it is absent and this is new build work, run `ls-design-contract` first. Read [design contract](../ls-design/references/design-contract.md) for the full consumption rule, [core principles](../ls-design/references/core-principles.md) when the direction is new or two rules conflict, and [rtl foundations](../ls-design/references/rtl-foundations.md) whenever the work ships a right-to-left locale or a locale-portable component. For a final acceptance pass, hand the result to `ls-design-review`.

Read [interface copy](../ls-design/references/interface-copy.md) when writing section headings, calls to action, and the form and error copy a multi-page site accumulates.
