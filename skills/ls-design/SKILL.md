---
name: ls-design
description: Direct high-quality frontend design work to the right L.S.Design workflow and establish a coherent visual direction before implementation. Use for full website or product-interface requests that span multiple design specialties.
---

# L.S.Design

Create interfaces with a clear point of view, strong hierarchy, and production-ready behavior. Preserve the product's truth instead of applying a house style.

## Decision order

Resolve conflicts in this order:

1. Explicit user and repository requirements
2. Product content, platform conventions, and established brand truth
3. Accessibility, usability, and functional correctness
4. Guidance from the relevant L.S.Design specialist
5. Aesthetic defaults and anti-pattern warnings

Treat an invariant as mandatory, a contextual default as a starting point, and an anti-pattern as a diagnostic signal rather than a ban. A user's explicit aesthetic choice may override a default, but not accessibility or functional correctness unless the user knowingly accepts the consequence.

## Route the work

Use the smallest specialist set that covers the request:

- Complete sites and responsive page systems: `ls-design-websites`
- Focused campaign, launch, or conversion pages: `ls-design-landing-pages`
- Responsive web or native mobile experiences: `ls-design-mobile`
- Existing-product audits and approved transformations: `ls-design-redesign`
- Tokens, components, variants, and documentation: `ls-design-systems`
- Typography, imagery, composition, and visual-world development: `ls-design-art-direction`
- Evidence-based design and implementation review: `ls-design-review`
- Three-dimensional, spatial, product-viewer, or procedural scenes: `ls-design-3d-web`

For multi-surface work, establish the shared direction here, then apply the relevant specialists. Do not load unrelated specialist references.

## Working method

1. Inspect the actual product, content, code, design tokens, target devices, and constraints before choosing a style.
2. State the design premise in one sentence: audience, desired feeling, and the visual behavior that supports it.
3. Establish hierarchy, content order, type roles, palette roles, spacing rhythm, imagery, and interaction character.
4. Implement in the project's existing stack. Preserve working behavior and avoid dependency changes unless they solve a concrete need.
5. Review the result at representative widths and interaction states. Fix the highest-impact failures before adding polish.

## Non-negotiable outcomes

- The interface explains what matters without relying on decorative ambiguity.
- Layout, typography, imagery, and motion reinforce the same design premise.
- Repetition creates a system without making every section identical.
- Essential content and controls remain semantic, responsive, keyboard operable, and legible.
- Visual distinction comes from composition and art direction, not indiscriminate effects.
- Existing brand fonts, colors, components, and product behavior are preserved unless change is in scope.

Read [references/core-principles.md](references/core-principles.md) when setting a new direction, resolving conflicting rules, or reviewing more than one surface.

For palette evidence and the required specificity check, read [references/natural-color-and-humanization.md](references/natural-color-and-humanization.md). For complex composition or layout-library selection, read [references/advanced-layout.md](references/advanced-layout.md).
