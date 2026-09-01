---
name: ls-design-redesign
description: Audit and improve an existing website or product interface while preserving required behavior, content, and brand equity. Use for redesigns, visual upgrades, modernization, or removal of generic interface patterns.
---

# L.S.Design Redesign

Improve the existing product from evidence. Do not erase functioning identity or behavior merely to make the interface look new.

## Decision order

User and repository requirements come first, followed by existing product and brand truth, accessibility and function, this specialist's guidance, then aesthetic defaults.

## Audit before editing

1. Inspect rendered surfaces, routes, components, tokens, assets, states, responsiveness, and interaction behavior.
2. Record what is distinctive and should survive.
3. Separate problems of hierarchy, content, system consistency, accessibility, responsiveness, performance, and visual craft.
4. Identify behavior and analytics that must not regress.
5. Propose the smallest coherent direction that resolves the important problems.

If the user requested only an audit, stop after evidence-backed findings and recommendations. Do not modify the project.

## Implementation constraints

- Preserve features, semantics, data flow, route behavior, tracking, and content unless their change is authorized.
- Reuse sound components and tokens; refactor only when the current structure prevents the intended result.
- Avoid global font or color replacement from an isolated component change.
- Replace generic patterns only when the replacement improves content hierarchy or interaction.
- Compare before and after at identical widths and states.

Read [references/redesign-audit.md](references/redesign-audit.md) for the finding format, severity model, and completion checks.

Read [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) when the redesign targets generic styling, palette overuse, or loss of brand character. Read [advanced layout decisions](../ls-design/references/advanced-layout.md) before replacing existing composition or introducing a layout dependency.
