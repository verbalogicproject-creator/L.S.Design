# Website craft

## Architecture

Map each route to a user question and desired next action. Keep global navigation stable; use local navigation only when it reduces cognitive load. Avoid pages created solely to satisfy a template slot.

## Section composition

Choose a structure from content needs: editorial column, split narrative, full-bleed media, annotated demonstration, comparison, proof sequence, timeline, index, or interactive explainer. Repeat a structure when repetition builds understanding, not because it is convenient.

Vary vertical rhythm intentionally. Large space should signal a new chapter or focus; dense space should express relationship. Prevent ornamental whitespace from pushing essential content beyond reasonable reach.

## Responsive completion

- Navigation remains understandable with touch, keyboard, zoom, and long labels.
- Media has stable aspect ratios and art-directed crops where needed.
- Text measure remains readable without fixed heights or clipping.
- Grids collapse by content priority, not arbitrary breakpoints.
- Sticky and fixed elements do not consume the narrow viewport.
- Footer and secondary routes remain fully usable on small screens.

## Performance-aware polish

Reserve image dimensions, subset and preload fonts selectively, lazy-load below-fold media, and keep decorative runtime work proportional to its visible value. Prefer progressive enhancement for elaborate motion or media.
