# Natural color and humanization

Use this reference when establishing a palette, translating physical materials into an interface, or checking whether a result feels interchangeable with generated design trends.

## Rule class and authority

Natural-first color is a **contextual default**, not an invariant. Explicit user direction, established brand truth, accessibility, platform semantics, and functional states have higher authority. Vivid color is appropriate when evidence supports it; ungrounded saturation is not a shortcut to distinction.

Humanization is an acceptance check for specificity and coherence. It does not require decoration, simulated imperfection, photography, or a particular visual style.

## Build color from evidence

1. Collect the product's real color evidence: brand assets, materials, environment, photography, content, and platform conventions.
2. Define semantic roles before shades: canvas, surface, text, muted text, border, accent, selection, focus, success, warning, and danger.
3. Start with neutrals tinted toward the product's material world. Use lightness, proportion, texture, and spacing for most hierarchy.
4. Choose an accent family and assign it a limited job. A primary action, selected state, and focus indicator may share a relationship without becoming visually identical.
5. Test every foreground and state pairing in context. Do not assume that a generated scale is accessible.

Use CSS `oklch()` when perceptual lightness and chroma control improve the system, and `color-mix()` when deriving related surfaces or states. Provide fallbacks when the target browser contract requires them. A library such as Radix Colors may supply a maintained scale; a color library such as Culori is justified only when the product needs programmatic conversion, gamut mapping, or palette generation.

Primary references: [MDN OKLCH](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch), [MDN `color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix), and [Radix Colors palette composition](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette).

## Treat effects as materials

- Glow or bloom implies emitted light. Use it when the object, brand, or interaction has a credible luminous source.
- Fluorescent color can be correct for safety, sport, nightlife, display hardware, or an established identity. It should not appear merely to make a dark interface feel premium.
- Avoid assigning one bright accent to every call to action, label, icon, focus ring, status, and decorative mark. Separate semantic meaning from visual signature.
- Match 3D materials under final lighting and tone mapping. A raw color value does not guarantee visual agreement between DOM and canvas.

## Humanization gate

Before calling the direction complete, verify:

- **Traceable premise:** important choices can be traced to the audience, product, content, brand, or environment.
- **Motif restraint:** normally one principal signature and one quieter counterpoint are enough. Repetition develops the motif without stamping it onto every section.
- **Content-led geometry:** section structure changes because the material changes, not because a template alternates left and right.
- **Specific language:** headings and labels contain useful product meaning. Generic poetic phrases do not replace evidence.
- **Scale and context:** physical products show proportion, use, construction, or interaction when that knowledge matters.
- **Rhythm:** dense and open passages, alignment and offset, text and media create deliberate pacing rather than constant spectacle.
- **Ordinary-state quality:** the direction still works in navigation, specifications, forms, errors, loading, and long content—not only in the hero.

## Convergence check

Pause when several familiar signals arrive as a bundle, such as near-black surfaces, acid accents, oversized grotesque type, italic serif contrast, pills, concentric rings, grain, glass, glow, and floating product renders. None is prohibited alone. Together they require product-specific justification.

Remove one effect at a time. If the product identity does not weaken, the effect was probably carrying trend recognition rather than meaning. If a deliberate exception remains, record why it supports the premise and verify it against the ordinary states.
