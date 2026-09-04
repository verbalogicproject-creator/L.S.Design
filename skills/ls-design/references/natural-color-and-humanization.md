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

Three motifs belong in the bundle rather than on any prohibition list, because each is correct under a stated condition and generic without it. Check the condition, not the motif:

- **Tinted near-black in place of pure black.** Correct on emissive displays, where pure black against near-white maximises halation and harsh contrast. It becomes a signal only alongside the rest of the bundle.
- **Monospace for labels and figures.** Correct where the content is genuinely tabular or numeric and alignment carries meaning. On a navigation item or a marketing label it is costume, signalling technical character the product has not earned.
- **A trailing arrow on link and action text.** Correct for genuinely directional navigation such as next, previous, and pagination. On an ordinary link it repeats an affordance the link already has.

## Countable observations

State these as a count first and judge them second. A count is verifiable; an impression is not. None is a defect on its own, and every one of them is legitimate for some brief — the diagnostic is a bundle arriving regardless of subject.

| Observation | Threshold |
|---|---|
| Tracked all-capitals eyebrow labels above headings | more than one per three sections |
| Middle dots separating metadata on one line | two or more on a line |
| Section-number eyebrows or tile pagination on content that is not a sequence | any |
| Background or accent values from the palette listed below | any exact match |
| A display face from the list below, chosen as a default rather than for the brief | any |
| Consecutive sections repeating one image-and-text split | more than two in a row |
| Distinct layout families across a long page | fewer than four across eight sections |
| Pure-black drop shadow on a light surface, or one shadow value under every card | any |
| One corner radius applied to every element regardless of hierarchy or material | any |
| Entrance animation on every section rather than one orchestrated moment | more than one unmotivated reveal |
| Generic step labels such as stage one, stage two, stage three | any, where the content is not a sequence |
| Scroll cues, whether text or an animated wheel | any |
| Fabricated product interface, version string, or status readout built from markup | any |
| Statistics presented with invented precision | any without a traceable source |

### The named bundle

Specific values make the check mechanical. This list describes what generated design converged on at the time of writing; it is evidence of convergence, not a permanent verdict on any value. Review it when the evidence moves, and treat a match as a prompt to justify the choice from the product.

- Warm off-white grounds: `#f4f1ea`, `#f5f1ea`, `#f7f5f1`, `#fbf8f1`
- Clay and brass accents: `#d97757`, `#b6553a`, `#b08947`, `#9a2436`
- Warm near-black text: `#1a1714`, `#1a1814`, `#1b1814`
- Display serifs reached for by default: Fraunces, Instrument Serif
- The composite: a warm off-white ground, a high-contrast display serif, and a single clay accent

A brief that names any of these wins outright. Established brand truth wins outright. What the check catches is the same combination appearing whatever the subject, which is convergence rather than direction.

For the copy entries in that table, and for the wider rule that words are design content, read [interface copy](interface-copy.md).
