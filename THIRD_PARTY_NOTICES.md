# Third-party notices and research inputs

L.S.Design is an original synthesis. It does not bundle code, images, fonts, model files, or installation tooling from the projects below.

## Taste Skill

- Local source reviewed: `taste-skill-main/taste-skill-main`
- Upstream project: <https://github.com/Leonxlnx/taste-skill>
- Copyright: 2026 Leonxlnx
- License: MIT
- Concepts considered: anti-generic design critique, art-direction discipline, redesign-first inspection, and visual variety.

## Impeccable

- Local source reviewed: `impeccable-main/impeccable-main`
- Upstream project: <https://github.com/pbakaus/impeccable>
- License: Apache License 2.0
- Concepts considered: design-system grounding, evidence-based review, anti-pattern diagnostics, and cross-provider skill packaging.

## UI UX Pro Max Skill

- Local source reviewed: `ui-ux-pro-max-skill-main`
- Upstream project: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>
- Copyright: 2024 Next Level Builder
- License: MIT
- Concepts considered: platform-aware UX lookup, responsive coverage, systematic design decisions, and broad interface-domain routing.

## Vibeship 3D Web Experience

- Source reviewed: user-supplied `3d-web-experience` skill text
- Identified upstream: <https://github.com/vibeforge1111/vibeship-spawner-skills>
- Package metadata claims Apache License 2.0, but the repository license file was not visibly available during research.
- No text or code was copied. Only high-level subject coverage was considered. L.S.Design replaces fixed hardware caps, user-agent detection, global tool installation, and unconditional remote embeds with measured, project-local, capability-aware guidance.

## Vector Topology Primitives

- Local source reviewed: `/storage/emulated/0/vector-topology-primitives`
- The project's README identifies `2/` as legacy historical exploration excluded from current evidence.
- Reused knowledge: generic mathematical construction patterns for point clouds, height fields, quantized comparisons, Voronoi views, and persistence diagrams.
- Excluded: research claims, agent commands, `.ctx` payloads, page typography, hard-coded colors, CDN choices, random-on-resize behavior, and any assertion that the illustrations are benchmark evidence.
- A scan found direct agent-oriented commands in legacy HTML and zero-width characters in `topology2.md`. These findings motivated the untrusted-content rules and scanner; none of that content has instruction authority in this suite.

## Version 1.1 layout and color research

The new shared references were developed from primary platform documentation. No documentation text, code, or package is bundled.

- MDN references: CSS Grid subgrid, container queries, CSS shapes, anchor positioning, the View Transition API, OKLCH, and `color-mix()`.
- Web rendering references: Three.js color management, `MeshPhysicalMaterial`, rendering on demand, and React Three Fiber performance guidance.

## Conditional library research

The advanced-layout reference evaluates these projects as optional tools selected inside a generated application:

- EGJS Grid for runtime masonry, justified, packing, and frame layouts; MIT.
- Floating UI for collision-aware overlay positioning; MIT.
- Motion for React layout-state animation; MIT.
- FormKit AutoAnimate for simple insertion, removal, and reorder continuity; MIT.
- React Grid Layout for user-authored draggable dashboard layouts; MIT.
- React Three UIKit and Yoga for spatial-interface layout. Yoga is MIT; verify the selected React Three UIKit package version and its license before adoption.
- Radix Colors and Culori for optional color scales or programmatic color processing; MIT.

These projects are cited as decision inputs only. L.S.Design has no Node.js runtime dependency, and generated projects must verify current versions, licenses, bundle effects, accessibility behavior, and fallbacks before installation.

## Version 2.0 studio dependencies

The `studio/` package (`ls-design-studio`) is the only part of this repository with runtime dependencies. The skills themselves still have none. Each dependency below is installed by the studio's own `package.json`; none is vendored into this repository.

| Package | License | Why it is here |
|---|---|---|
| `hono` | MIT | HTTP routing, static serving, and server-sent events for the local control room |
| `@hono/node-server` | MIT | Node adapter for the above |
| `@modelcontextprotocol/sdk` | MIT | The stdio MCP entry that a coding agent attaches to |
| `zod` | MIT | One schema definition that serves runtime validation, TypeScript types, and the generated JSON Schema |
| `yaml` | ISC | Round-tripping the design.md frontmatter without touching the prose |
| `culori` | MIT | Parsing any CSS color, including OKLCH, for the WCAG contrast calculation |
| `chokidar` | MIT | Noticing an external edit to DESIGN.md |
| `playwright-core` | Apache-2.0 | Optional. Headless screenshots; the studio falls back to spawning a Chromium binary directly, and degrades to "screenshots unavailable" rather than failing a build |
| `react`, `react-dom` | MIT | The control-room interface |
| `vite`, `@vitejs/plugin-react` | MIT | Building that interface |
| `typescript`, `vitest` | Apache-2.0, MIT | Type checking and tests |

No browser binary is downloaded by this package. The screenshot module resolves an existing Chromium through the `LS_DESIGN_CHROMIUM` environment variable or a short list of standard paths.

## Version 2.0 format and pattern research

- **The public `design.md` format.** `design/DESIGN.md` is written to the publicly documented design.md specification — `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components` — so the file stays readable by any tool that understands that format. The specification is a format, not code; nothing from it is bundled. Suite-specific state is deliberately kept out of the file and stored in `design.json` instead.
- **W3C Design Tokens Community Group format.** Reviewed as a naming and structure influence for semantic role tokens. Not adopted as the on-disk format, because a second format would fragment the contract.
- **Screen-generation services reached over MCP.** The orchestration protocol was developed against one such service and documents its call sequence — upload the token document, create a design system from it, apply it, then generate. No client, key, or code from any such service is included, and the studio works with agent-authored screens when no service is available.
- **Impeccable** (already cited above) contributed the pattern of keeping the design document free of tool-specific stamps and storing extras in a sidecar, and the idea of a blocking local page where a person makes a decision the agent then reads.
- **OpenDesign** (`nexu-io/open-design`, Apache-2.0). Reviewed as a pattern source only: the package contract of a manifest plus a design document plus a token stylesheet, one-command MCP registration, and a named workflow loop. No code, schema, or dependency was taken, and no adapter is committed.
- **Material Design and the Apple Human Interface Guidelines** were the sources consulted for the bidirectional mirror and never-mirror list in the shared right-to-left reference. The list is a summary of documented platform behaviour, written in this project's own words.
- **WCAG 2.1 and 2.2** define the contrast ratios and target sizes the contract verifies. The relative-luminance and contrast-ratio implementations in `studio/shared/contrast.ts` and in the generated preview are written from the published formulas.

## Authoritative guidance

The reference files link to primary documentation from W3C, MDN, web.dev, Three.js, React Three Fiber, Drei, Khronos glTF, glTF Transform, model-viewer, and Spline. Those links are citations, not bundled dependencies. Version-sensitive behavior must be checked against the versions installed in the target project.

MIT-licensed source projects retain their original copyright and license terms. Apache-licensed sources retain their notices and license terms. See the upstream projects for complete source distributions.
