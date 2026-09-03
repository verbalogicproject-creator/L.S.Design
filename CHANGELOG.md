# Changelog

All notable changes to L.S.Design are recorded in this file.

The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Dates use the `YYYY-MM-DD` format.

## [2.0.0] - 2026-09-02


### Added after the first Orbit One run

- `ls-design-studio lint-build` — checks a built implementation against the contract it was built from. Statically: colour and asset literals in the source, `href="#"` stubs and anchors that resolve to nothing, components without a named Props type. On the running page: every `--ls-*` token compared against the frozen `tokens.css` (values resolved and normalised, so a minifier's `.5rem` or `#fff` is not reported as drift), the `body` type role still bound to the contract, off-origin requests, whether the page is readable with scripting disabled, and horizontal overflow at each width.
- Four implementation rules in `ls-design-build`: one component per pattern with a named Props type, content in a data module, every navigation target resolving, and nothing called done before it compiles and lints.

### Added

- `ls-design-contract`: the suite now emits an artifact. It writes `design/DESIGN.md` in the public design.md format, plus `design.json`, a generated `tokens.css`, a framework theme bridge, and a self-contained `preview.html` that recomputes its own WCAG contrast, measures overflow at 360, 768, and 1440 pixels, and reports zero bidirectional control characters.
- `ls-design-studio`: a local design control room. A canvas of generated screens, a token panel with live contrast, approve and reject with notes, a request queue, and a gate that releases an approved handoff. It ships as the `ls-design-studio` npm package under `studio/`, with a Hono HTTP server that is the single writer of `design.json` and a separate stdio MCP entry that proxies to it.
- `ls-design-build`: implements a frozen handoff into working code, defaulting to Vite, React, and Tailwind v4, with fixture quarantine so invented prices, ratings, and quotations are recognised rather than shipped.
- Two shared references every skill now consumes: `design-contract.md`, which states the consumption rule, and `rtl-foundations.md`, a script-agnostic guide to logical properties, mirroring, bidirectional isolation, and typography across writing systems.
- Twelve MCP tools for agent orchestration, with a documented error code for every failure mode and a long-poll wait so an agent blocks on a person's decision instead of guessing it.
- `design/handoff/`: a deterministic, gate-guarded snapshot — brief, frozen contract, approved screens as both HTML and PNG, quarantined fixtures, target stack, and a checksum manifest.

### Changed

- All nine existing skills now link the shared design contract, core principles, and right-to-left references, and route a finished result to `ls-design-review`. `core-principles.md` is no longer reachable from the hub alone.
- `ls-design-review` verifies an implementation against the contract and the handoff when they exist, and uses the thirteen comparison areas as its literal scoring method.
- The default palette shipped with the contract template now passes every declared contrast pair in both themes. `border` and `border-strong` were separated: a decorative hairline is deliberately subtle, and a control boundary is verified at 3:1.
- `scripts/validate.py` scans provider markers across every skill reference and the description, extends the hidden-character, byte-order-mark, and scaffold checks to HTML, CSS, and JSON, enforces logical CSS in the contract templates, checks the preview template's parameters, warns on an oversized description, and no longer treats `mailto:` as a broken link.
- `suite-rules.json` declares five shared references across twelve skills and names the keys that are documentation only, which the validator now enforces.

### Fixed

- The design.md round-trip preserves the prose body exactly, including the blank line after the closing delimiter, across any number of parse and serialize cycles.
- The installer count in the test suite is derived from the installer rather than hardcoded.


## [1.1.0] - 2026-09-01

### Added

- Shared natural-color and humanization guidance grounded in product materials, semantic roles, restrained accents, ordinary states, and explicit convergence checks.
- Native-first advanced-layout guidance covering intrinsic composition, subgrid, container queries, editorial shapes, overlays, view transitions, responsive recomposition, and hybrid DOM/3D surfaces.
- A conditional dependency matrix for EGJS Grid, Floating UI, Motion, AutoAnimate, React Grid Layout, React Three UIKit, and Yoga.
- Product-scene craft guidance for grounded composition, purposeful camera limits, material fidelity, selective post-processing, render-on-demand behavior, and honest distinction between illustration and real 3D.
- A required humanization acceptance gate in frontend review.
- Machine-readable shared-reference coverage with validator and regression-test enforcement across all nine skills.

### Changed

- Natural, material-derived palettes are now the contextual default while established brand direction and justified vivid color remain supported.
- Every specialist now routes to the same shared color, humanization, and layout policies, preventing duplicated or contradictory guidance.
- The controlled Orbit One comparison now includes explicit release acceptance criteria and reproducible scoring guidance.


## [1.0.0] - 2026-09-01

### Added

- Nine provider-neutral design skills for websites, landing pages, mobile experiences, redesigns, systems, art direction, reviews, and 3D web work.
- One shared decision order that protects user requirements, product truth, accessibility, and working behavior.
- Focused references for responsive craft, conversion narratives, mobile platforms, redesign audits, system contracts, art direction, and review coverage.
- A comprehensive 3D skill covering Three.js, React Three Fiber, Plotly, D3, `model-viewer`, conditional Spline use, WebGL2, and capability-enhanced WebGPU.
- Procedural recipes for seeded point clouds, mathematical height fields, quantized comparisons, Voronoi views, graphs, and persistence diagrams.
- Adaptive 3D quality, semantic controls, reduced motion, static fallbacks, asset validation, color management, and lifecycle cleanup guidance.
- Atomic checksum-verified installation for Codex-compatible and Claude Code skill layouts.
- Structural, portability, source-integrity, installer, and regression tests.
- A scanner for hidden Unicode, remote scripts, embedded prompt directives, and context-payload markers.
- Complete public documentation, contribution guidance, security reporting, community standards, CI, and a controlled skill-comparison exercise.

[1.1.0]: https://github.com/verbalogicproject-creator/L.S.Design/releases/tag/v1.1.0
[1.0.0]: https://github.com/verbalogicproject-creator/L.S.Design/releases/tag/v1.0.0
