# Design-system contract

## Token tiers

- **Foundation:** raw palette, type ramps, spacing steps, radii, and motion values.
- **Semantic:** canvas, surface, content, border, action, status, focus, and elevation roles.
- **Component:** values needed for a stable component contract; use sparingly.

Product code should usually consume semantic or component tokens. Themes change role assignments without changing component meaning.

## Component contract

Define purpose, anatomy, semantics, supported content, variants, sizes, states, interaction, keyboard behavior, responsive behavior, theming hooks, and invalid combinations. Prefer composition when children have independent semantics.

## Change management

Introduce additions from demonstrated product needs. Mark deprecated tokens and components, provide a migration mapping, and verify downstream surfaces before removal. Do not claim a migration is complete until product usages and visual states are checked.
