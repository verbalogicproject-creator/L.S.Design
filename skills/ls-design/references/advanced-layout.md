# Advanced layout decisions

Use this reference for complex responsive composition, editorial pacing, galleries, overlays, rearranging interfaces, or hybrid DOM and 3D surfaces.

## Native-first decision ladder

Choose the lowest-complexity layer that expresses the content correctly:

1. Start with semantic document flow, intrinsic sizing, logical properties, and resilient spacing.
2. Use Flexbox for one-dimensional distribution and Grid for two-dimensional relationships.
3. Use named lines and subgrid when nested content must share alignment.
4. Use container queries when a component should respond to its available space rather than the viewport.
5. Add `shape-outside`, multicolumn layout, or controlled overlap for editorial composition only when reading order and narrow layouts remain clear.
6. Treat CSS anchor positioning and view transitions as progressive enhancements with a stable baseline.
7. Add a library only when runtime measurement, packing, collision handling, dragging, or state interpolation is genuinely required.

Primary references: [MDN subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid), [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries), [MDN CSS shapes](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shapes), [MDN anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning), and [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API).

## Compose from content

- Establish reading order in the DOM before visual rearrangement.
- Let copy length, media aspect, comparison structure, and interaction determine tracks and breakpoints.
- Prefer a small vocabulary of alignments, spans, offsets, crops, and density changes over unrelated section templates.
- Preserve recognizable anchors across recomposition: heading, current action, selected item, and media subject.
- Do not solve weak hierarchy with overlap, absolute positioning, scroll capture, or a masonry effect.
- Use container-relative behavior for reusable components and viewport-relative behavior for page-level composition.

## Conditional libraries

| Need | Candidate | Boundary |
|---|---|---|
| Dynamic masonry, justified media, packing, or authored frames | [`@egjs/grid`](https://naver.github.io/egjs-grid/) | Use for collections whose dimensions or order change; keep ordinary document flow when the layout is static. |
| Collision-aware tooltip, menu, select, or popover placement | [Floating UI](https://floating-ui.com/docs/tutorial) | It is an overlay positioning engine, not a page-composition system. |
| React reordering, shared-element continuity, or measured layout-state animation | [Motion layout animation](https://motion.dev/docs/react-layout-animations) | Establish the static layout first and respect reduced motion. |
| Simple insertion, removal, or reorder feedback | [AutoAnimate](https://auto-animate.formkit.com/) | Prefer it only when its automatic behavior matches interruption and accessibility needs. |
| User-authored draggable and resizable dashboard panels | [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout) | Do not use it for ordinary marketing or editorial composition. |
| Flex-like layout inside a real React Three Fiber spatial interface | [React Three UIKit](https://pmndrs.github.io/uikit/docs/getting-started/introduction) and [Yoga](https://www.yogalayout.dev/) | Keep normal site content in DOM; review package license, input, text, fallback, and runtime costs. |

The skill suite itself installs none of these packages. In a generated project, record the problem being solved, why native layout is insufficient, package and license status, expected client cost, accessibility behavior, fallback, and removal path. Pin the project-selected version through its normal package manager and verify current documentation.

## Responsive and interaction checks

Test narrow, medium, wide, short, zoomed, and text-expanded states. Also verify long labels, missing media, reordered content, keyboard focus, overlay collisions, browser back/forward transitions, reduced motion, and layout stability during loading.

For a library-driven collection, confirm that visual order does not corrupt reading or focus order. For a hybrid 3D surface, keep essential layout and controls in DOM and ensure the canvas can fail without collapsing the page.
