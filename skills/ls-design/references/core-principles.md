# L.S.Design core principles

## Rule classes

- **Invariant:** required for safe, accessible, or coherent output.
- **Contextual default:** a strong starting point that should yield to product evidence.
- **Anti-pattern warning:** a prompt to inspect intent and execution, not a universal prohibition.
- **User-overridable preference:** a taste choice the user may explicitly select.

## Direction before decoration

Choose a premise that can guide decisions: restrained editorial clarity, tactile warmth, precise technical confidence, expressive cultural energy, or another product-specific direction. Do not combine unrelated trends merely to signal sophistication.

Use references to extract principles rather than copy surfaces. Identify what creates the effect: scale contrast, density, negative space, crop, rhythm, material, interaction, or image treatment.

## Hierarchy

Make the primary action and primary message obvious. Use scale, position, contrast, and spacing before adding borders, shadows, or labels. Keep supporting content subordinate without making it illegible.

Avoid turning every statement into a card. Containers should express grouping, interaction, or material—not compensate for weak composition.

## Typography

Preserve existing brand typography unless replacement is authorized. Assign explicit roles for display, heading, body, label, data, and code where applicable. Tune measure, leading, weight, and optical spacing for the actual typeface and viewport.

Do not load a named font without verifying it is available. Provide intentional fallbacks and avoid changing global font rules for an isolated component or visualization.

## Color and materials

Begin with semantic roles: canvas, surface, text, muted text, border, accent, success, warning, and danger. Use color contrast and state semantics consistently. Avoid arbitrary hard-coded colors inside charts, shaders, illustrations, or components when project tokens exist.

Effects such as glass, grain, blur, gradients, glow, and deep shadow are materials. Use only those that support the premise and remain performant and legible.

## Layout variety

Create rhythm through controlled contrast: dense then open, aligned then offset, text-led then image-led, static then interactive. Variety should clarify the narrative. Do not randomize structure or alternate patterns mechanically.

## Motion

Motion must communicate state, continuity, hierarchy, or causality. Respect reduced-motion preferences. Keep essential actions immediate, prevent layout shifts, and avoid scroll capture unless the experience explicitly depends on it and offers an equivalent path.

## Responsive behavior

Design for content pressure, not device labels. Test narrow, medium, wide, short, zoomed, and text-expanded conditions. Recompose when the hierarchy demands it; do not merely shrink desktop layouts.

## Completion evidence

Inspect rendered output at representative sizes. Verify focus, hover, active, disabled, loading, empty, error, long-content, and overflow states that exist in the product. A polished default state does not compensate for broken real states.
