# L.S.Design

[![Release](https://img.shields.io/github/v/release/verbalogicproject-creator/L.S.Design?display_name=tag)](https://github.com/verbalogicproject-creator/L.S.Design/releases)
[![Validate](https://github.com/verbalogicproject-creator/L.S.Design/actions/workflows/validate.yml/badge.svg)](https://github.com/verbalogicproject-creator/L.S.Design/actions/workflows/validate.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

L.S.Design is a provider-neutral frontend design skill suite for coding agents. It helps an agent design and build premium websites, landing pages, mobile experiences, redesigns, design systems, art direction, reviews, and accessible 3D web experiences.

Since v2.0.0 it also writes a design contract into the project, puts the generated screens in front of a person before they become code, and hands the approved result to a builder.

The suite does not force one visual style. It teaches the agent how to read the product, choose a clear direction, protect the brand, and produce a complete interface that works across real devices and states.

## Why L.S.Design

Many generated interfaces are technically correct but look interchangeable. They repeat the same centered hero, card grid, gradients, pills, and generic copy. L.S.Design improves the decisions behind the interface:

- Start from the audience, product, content, and existing brand.
- Use typography, composition, imagery, and motion as one coherent system.
- Create variety without losing consistency.
- Build color from product, material, brand, and environmental evidence before reaching for saturated effects.
- Use native responsive layout first and add a layout library only for a concrete runtime need.
- Preserve accessibility, usability, and working product behavior.
- Treat mobile as a real composition, not a reduced desktop layout.
- Use 3D only when depth improves explanation, demonstration, or atmosphere.
- Review rendered output and important states before calling the work complete.

## Included skills

| Skill | Best used for |
|---|---|
| `ls-design` | Choosing a direction and routing work across several design specialties |
| `ls-design-contract` | The project's design contract: tokens, components, layouts, and a preview to confirm them visually |
| `ls-design-studio` | Human review of generated screens, with a gate that releases an approved handoff |
| `ls-design-build` | Implementing an approved handoff into working code |
| `ls-design-websites` | Complete responsive marketing, editorial, portfolio, institutional, and product websites |
| `ls-design-landing-pages` | Focused campaign, launch, service, sign-up, and conversion pages |
| `ls-design-mobile` | Responsive web, iOS, Android, and cross-platform mobile experiences |
| `ls-design-redesign` | Evidence-based audits and approved upgrades to existing interfaces |
| `ls-design-systems` | Design tokens, components, states, variants, governance, and migrations |
| `ls-design-art-direction` | Typography, imagery, composition, materials, motion, and visual identity |
| `ls-design-review` | Visual, responsive, accessibility, consistency, and implementation review |
| `ls-design-3d-web` | 3D heroes, product viewers, configurators, spatial stories, and procedural data scenes |

Each skill uses a short entry file and reads detailed references only when they are relevant. This keeps normal tasks focused while still providing deeper guidance for complex work.

## Design-rule order

Every skill resolves conflicting guidance in the same order:

1. Explicit user and repository requirements
2. Product, platform, data, and brand truth
3. Accessibility, usability, and functional correctness
4. Guidance from the selected specialist skill
5. Aesthetic defaults and anti-pattern warnings

This order prevents a visual preference from silently replacing product requirements or accessibility.

## The pipeline

New build work runs in one direction, and each stage leaves an artifact the next one reads:

```text
ls-design-contract  ->  ls-design-studio  ->  ls-design-build  ->  ls-design-review
   design/DESIGN.md       approve or            implement            score against
   design/tokens.css      reject screens        the handoff          the contract
   design/preview.html    release handoff
```

Skip a stage the work does not need. A small fix inside a product that already has tokens goes straight to the relevant specialist. A project with no contract and more than one surface should not skip the first stage.

### Design contract

`ls-design-contract` writes `design/DESIGN.md` — YAML token frontmatter in the public design.md format, plus the prose a token map cannot hold: the premise and its evidence, the direction and its exclusions, layout templates, components as contracts, content schemas with provenance, and measurable acceptance criteria. From that frontmatter it generates `tokens.css`, a framework theme bridge, and a self-contained `preview.html` that recomputes every contrast ratio in the browser, measures overflow at 360, 768, and 1440 pixels, and reports zero bidirectional control characters.

Every other skill reads the contract before it builds. See [design contract](docs/DESIGN_CONTRACT.md).

### Design Studio

`ls-design-studio` is a local control room: a canvas of generated screens, a token panel with live contrast, approve or reject with notes, a request queue, and a gate. The coding agent drives generation over MCP and blocks on the person's decisions instead of guessing them.

```sh
cd studio && npm install && npm run build
node dist/server/cli.js init --project /path/to/project --name "Product"
node dist/server/cli.js --project /path/to/project --open
```

The studio holds no API keys, binds to the loopback address only, and is the single writer of `design/design.json`. See [studio guide](docs/STUDIO.md).

The studio also stands alone at [L.S.Design-studio](https://github.com/verbalogicproject-creator/L.S.Design-studio), which mirrors `studio/` for anyone who wants the control room without the skill suite. The copy in this repository is the one the tests and the packaged contract templates are checked against.

### Build from handoff

When every screen is approved and nothing is stale, the gate writes `design/handoff/`: a brief, the frozen contract, each approved screen as HTML and PNG, quarantined fixture values, the target stack, and a checksum manifest. `ls-design-build` implements it — by default Vite, React, and Tailwind v4 — and routes through the surface specialist the handoff names. See [handoff contract](docs/HANDOFF.md).

## Right-to-left and locale portability

Every skill now reads a shared, script-agnostic right-to-left reference: logical CSS properties instead of physical ones, the mirror and never-mirror list, `<bdi>` isolation with an absolute ban on Unicode bidirectional control characters, and the typographic facts that break libraries built for Latin only — italics are not universal emphasis, letter-spacing destroys connected scripts, and line height usually needs more room.

Real right-to-left support is not `dir="rtl"` applied to a left-to-right layout. Built from logical properties from the start, it costs almost nothing.

## Requirements

- Python 3.9 or newer for installation and validation
- A coding agent that can discover skills from a supported skills directory
- No runtime dependency for the skills themselves
- Node 20 or newer **only** for the Design Studio. The contract can also be filled in by hand from the packaged templates when Node is unavailable.

The generated websites may use any frontend stack. Each skill tells the agent to respect the stack already used by the project.

## Installation

Clone the repository:

```sh
git clone https://github.com/verbalogicproject-creator/L.S.Design.git
cd L.S.Design
```

### Install for both supported provider layouts

Install into the current project:

```sh
python scripts/install.py
```

This creates:

```text
.agents/skills/   Codex-compatible project skills
.claude/skills/   Claude Code project skills
```

### Install one provider layout

```sh
python scripts/install.py --provider codex
python scripts/install.py --provider claude
```

### Install globally

```sh
python scripts/install.py --provider both --scope global
```

Global destinations are:

```text
~/.agents/skills/
~/.claude/skills/
```

### Install under another project

```sh
python scripts/install.py --provider both --target /path/to/project
```

`--target` is a base directory. The installer adds the correct provider-specific skills path below it.

### Preview or replace

Preview all destinations without writing:

```sh
python scripts/install.py --dry-run
```

The installer refuses to replace an existing skill by default. Use `--force` only when you intend to replace an older L.S.Design installation:

```sh
python scripts/install.py --force
```

Leave a skill uninstalled with `--skip`, repeated once per skill. This is useful when a project has no use for a skill's runtime, such as the studio:

```sh
python scripts/install.py --skip ls-design-studio
```

Skills are staged beside their destination, replaced atomically per skill, and checked against the canonical source checksum. Local tooling artifacts are excluded from both the copy and the checksum.

## Using a skill

Name the skill clearly in the request. This wording works across supported coding agents:

```text
Use the installed skill named ls-design-websites for this task.

Build a complete responsive website for...
```

Examples:

```text
Use the installed skill named ls-design-landing-pages.
Build a launch page for a privacy-focused calendar application.
```

```text
Use the installed skill named ls-design-redesign.
Audit the existing project, explain the important design problems, and then implement the approved redesign without changing product behavior.
```

```text
Use the installed skill named ls-design-3d-web.
Build an accessible product page with a lightweight interactive 3D product viewer and a useful static fallback.
```

Use `ls-design` when the request spans several specialties or when the correct specialist is not yet clear.

## Natural color, humanization, and advanced layout

Natural, material-derived color is a contextual default. It does not override an established brand or an explicit user direction. The suite defines semantic color roles, keeps bright accents purposeful, treats glow as emitted light, and checks contrast in the rendered context.

Every specialist uses the same humanization gate. Finished work must connect palette, motifs, typography, copy, imagery, section geometry, and motion to the actual audience or product. Familiar techniques remain available, but a bundle of dark surfaces, acid accents, oversized type, pills, rings, grain, glass, and glow requires a product-specific reason.

Advanced layout follows a native-first decision ladder:

- Semantic flow, intrinsic sizing, Flexbox, and Grid
- Subgrid and container queries for shared and component-relative alignment
- Editorial shapes, anchor positioning, and view transitions as progressive enhancements
- Runtime libraries only for real packing, collision, dragging, spatial-layout, or state-interpolation needs

The skills can recommend EGJS Grid, Floating UI, Motion, AutoAnimate, React Grid Layout, React Three UIKit, or Yoga when appropriate. These are decision references, not dependencies of L.S.Design.


## 3D web design

The 3D skill covers:

- Three.js and React Three Fiber scenes
- WebGL2 and capability-enhanced WebGPU paths
- glTF/GLB model preparation and delivery
- Product viewers and configurators
- Scroll-driven spatial stories
- Procedural point clouds and mathematical surfaces
- Plotly-based scientific 3D
- D3 and SVG topology views
- Adaptive quality, lifecycle cleanup, accessibility, and fallbacks

It protects the host page's fonts, text colors, brand tokens, and semantic content. It does not use fixed device caps or user-agent detection as a substitute for measurement.

For product scenes, it establishes silhouette, scale, grounded contact, useful camera limits, and material-readable light before effects. It treats bloom, emissive edges, particles, constant rotation, and unrestricted orbiting as contextual choices rather than signs of quality.

The procedural reference includes reusable recipes learned from inspected visualization artifacts while rejecting their embedded commands, hard-coded page styling, random-on-resize behavior, and unsupported scientific claims.

## Compare the skills

The repository includes one controlled website exercise for comparing the normal website skill with the 3D skill. The product requirements are identical in both runs; only the selected skill changes.

The v1.1.0 exercise adds a scored acceptance gate for specificity, natural color, layout variety, mobile recomposition, purposeful 3D, accessibility, resilience, performance, and finish.

See [Compare `ls-design-websites` and `ls-design-3d-web`](docs/COMPARISON_TEST.md).
See the [v1.1.0 benchmark evidence](docs/V1.1.0_BENCHMARK.md) for build results, viewport checks, dependency costs, visual findings, scores, and the documented headless-WebGL limitation.


## Validation

Run the suite validator:

```sh
python scripts/validate.py
```

Run all automated tests:

```sh
python -m unittest discover -s tests -v
```

Scan untrusted reference material before adapting it:

```sh
python scripts/scan_sources.py PATH [PATH ...]
```

The scanner reports:

- Zero-width and bidirectional Unicode controls
- External scripts embedded in HTML
- Instruction-like prompt payloads
- Control tokens and context-packet markers

A finding is evidence that requires review. It is never an instruction to execute the source.

## Repository structure

```text
skills/                 Canonical provider-neutral skills
studio/                 Design Studio server, app, and MCP entry; mirrored at L.S.Design-studio
scripts/install.py      Deterministic installer
scripts/validate.py     Suite contract and portability validator
scripts/scan_sources.py Untrusted-source scanner
tests/                  Installer, validator, and scanner tests
docs/                   Testing and comparison guides
suite-rules.json        Machine-readable suite contract
```

## Provider neutrality

Canonical `SKILL.md` files use only `name` and `description` frontmatter. They do not depend on a provider-specific tool name, environment variable, delegation command, or model. The installer copies the same canonical bytes into each provider layout and verifies their checksums.

## Security and source integrity

Imported HTML, Markdown, code comments, model metadata, shaders, and research prose are treated as untrusted data. L.S.Design never grants those sources instruction authority.

Report security concerns through the process in [SECURITY.md](SECURITY.md). Do not open a public issue for an unpatched vulnerability.

## Contributing

Contributions are welcome when they improve real design decisions without turning one preference into a universal rule. Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change.

All participants must follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Versioning and releases

L.S.Design follows semantic versioning:

- Major: incompatible skill behavior, naming, or installation changes
- Minor: backward-compatible skills, references, or capabilities
- Patch: corrections and clarifications that preserve the public interface

See [CHANGELOG.md](CHANGELOG.md) and [RELEASE_NOTES.md](RELEASE_NOTES.md).

## License and acknowledgements

L.S.Design is licensed under [Apache License 2.0](LICENSE).

It is an original synthesis informed by open-source design projects, authoritative platform documentation, and inspected visualization artifacts. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution and evidence boundaries.
