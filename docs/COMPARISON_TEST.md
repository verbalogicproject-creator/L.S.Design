# Compare the website and 3D skills

This exercise shows how two L.S.Design specialists respond to the same product brief.

The only planned difference is the selected skill:

- Run A uses `ls-design-websites`.
- Run B uses `ls-design-3d-web`.

Do not change the base prompt between runs.

## Prepare two clean folders

Use two separate empty folders so one implementation cannot influence the other:

```text
orbit-one-website/
orbit-one-3d/
```

Use the same coding agent, model, reasoning level, tool permissions, package manager, and time budget for both runs.

## Run A: website skill

Start the request with:

```text
Use the installed skill named ls-design-websites for this task.
```

Append the unchanged base prompt below.

## Run B: 3D skill

Start the request with:

```text
Use the installed skill named ls-design-3d-web for this task.
```

Append the same unchanged base prompt below.

## Base prompt — copy without changes

```text
Build a complete, production-ready single-page website for Orbit One, a fictional compact tabletop wireless speaker.

Work in the current folder. If it is empty, create a Vite project using TypeScript and standard CSS. Add a rendering dependency only if the selected design skill genuinely needs it.

Product facts:
- Product name: Orbit One
- Price: $249
- Main benefit: clear room-filling sound from a compact sculptural speaker
- Materials: recycled aluminum shell and woven acoustic fabric
- Battery life: up to 12 hours
- Colors: Graphite and Sand
- Included controls: power, volume, playback, Bluetooth pairing, and color selection

Build these sections:
1. Header with product name and navigation
2. Hero with a strong product demonstration and primary “Explore Orbit One” action
3. Product story
4. Three feature explanations
5. Materials and craftsmanship section
6. Interactive Graphite/Sand color selector
7. Technical specifications
8. Final purchase call to action
9. Complete footer

Requirements:
- Choose the visual direction that best fits the selected skill.
- Make the result feel intentional, premium, and specific to this product.
- Create all visuals locally with HTML, CSS, SVG, Canvas, or WebGL.
- Do not use external image URLs, remote fonts, stock photography, or image-generation services.
- Do not invent reviews, awards, customer logos, or additional performance claims.
- Support mobile screens from 360px wide through large desktop screens.
- Use semantic HTML, visible keyboard focus, sufficient contrast, and reduced-motion support.
- Make navigation, the color selector, and calls to action functional.
- Keep important text and controls available without Canvas or WebGL.
- If a renderer is used, include loading, failure, reduced-quality, and static fallback behavior.
- Avoid unfinished placeholders, broken links, and empty sections.
- Run the production build and fix all errors before finishing.
- Do not ask design questions. Make reasonable decisions and complete the full implementation.
```

## What to compare

Open both results at the same viewport sizes and compare:

| Area | Questions |
|---|---|
| Direction | Does the website have a clear product-specific idea? |
| Hierarchy | Can you understand the product and next action quickly? |
| Product demonstration | How does each skill make the speaker understandable and desirable? |
| Composition | Are the sections varied without becoming inconsistent? |
| Interaction | Does the color selector feel connected to the product? |
| Mobile | Does the page recompose well at 360px rather than only shrinking? |
| Accessibility | Can you use the page by keyboard and with reduced motion? |
| Resilience | Is the important content still available when visual enhancement fails? |
| Performance | How much code, loading, and runtime work does the design require? |
| Finish | Are all states, links, responsive layouts, and build checks complete? |
| Natural color | Does the palette come from the product and keep bright accents purposeful? |
| Humanization | Do copy, motifs, scale, and section geometry feel specific rather than formulaic? |
| Spatial purpose | Does any 3D improve understanding or atmosphere enough to justify its cost? |

## Controlled release run

Run the release comparison with:

- 360px, 768px, and 1440px viewport checks
- Identical agent, model, reasoning level, permissions, package manager, time budget, and base prompt
- Fresh folders with no shared source or dependency cache inside either project
- A successful production build for both results
- Keyboard, reduced-motion, loading, error, and renderer-fallback checks where applicable
- Source inspection for remote assets, fabricated claims, dependencies, and meaningful DOM content

## Release acceptance

- Both production builds pass.
- No blocking or high-severity accessibility, functional, overflow, or fallback defect remains.
- Score each comparison area from 1 to 5. No area may score below 3, and each result must average at least 4.
- No result depends on an ungrounded fluorescent palette, repeated decorative motif, or bundled trend formula.
- Product language remains specific and within the supplied facts.
- Every added dependency has a documented purpose, license check, accessibility behavior, fallback, and client-cost reason.
- A renderer-based result remains useful without the renderer and uses spatial interaction for a clear purpose.

## Record the result

Store release evidence separately from the generated projects. Record:

- Date, release version, prompt checksum, and project paths
- Selected skill and unchanged generation settings
- Toolchain and resolved dependency versions
- Build, keyboard, reduced-motion, fallback, and viewport results
- Scores with short observable evidence for every comparison area
- Remaining risks, failed gates, and the decision to accept or revise the release

## Expected difference

The website skill should usually emphasize content architecture, responsive composition, typography, section rhythm, and efficient media treatment.

The 3D skill should decide whether a spatial product representation materially improves the page. If it uses 3D, it should also add measured quality control, semantic controls, loading and failure states, reduced motion, and a useful static fallback. It should not add 3D merely to make the implementation more complex.

The exercise has no predetermined visual winner. A simpler result may be stronger if it communicates the product more clearly and reliably.

The completed v1.1.0 run is recorded in [v1.1.0 benchmark evidence](V1.1.0_BENCHMARK.md).
