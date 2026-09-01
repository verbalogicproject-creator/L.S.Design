---
name: ls-design-systems
description: Create, extend, or rationalize frontend design systems, tokens, components, variants, and usage guidance. Use when consistency and reusable product primitives are the main deliverable.
---

# L.S.Design Systems

Build a system from real product needs. A design system is a governed interface between design intent and implementation, not a decorative component gallery.

## Decision order

User and repository requirements come first, followed by product and platform truth, accessibility and function, this specialist's guidance, then aesthetic defaults.

## Workflow

1. Inventory current tokens, primitives, components, variants, states, and duplication.
2. Define semantic foundations for color, typography, spacing, shape, elevation, motion, and responsive behavior.
3. Model components around meaning and interaction, not individual screenshots.
4. Specify states, content constraints, composition rules, and accessibility behavior.
5. Migrate incrementally and verify representative product surfaces.

## System constraints

- Prefer semantic tokens over raw values in product components.
- Keep primitive scales small enough to be learnable but rich enough for real needs.
- Avoid variant matrices that encode every one-off visual request.
- Preserve native semantics and composition; do not make one universal component responsible for unrelated interaction models.
- Document exceptions and deprecations rather than silently forking behavior.
- Treat charts, illustrations, shaders, and 3D materials as consumers of shared brand and semantic tokens where appropriate.

Read [references/system-contract.md](references/system-contract.md) when defining token tiers, component APIs, or migration rules.
