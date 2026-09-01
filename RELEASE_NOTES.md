# L.S.Design v1.1.0 — Human-Centered Layout and 3D Craft

L.S.Design v1.1.0 improves how the suite makes visual decisions. It adds stronger layout expertise, natural color direction, a required humanization check, and more disciplined product-focused 3D guidance without adding another skill or runtime dependency.

## Why this release

Generated websites can be polished yet still feel interchangeable. Common combinations—dark heroes, fluorescent accents, oversized type, pills, concentric graphics, glow, and isolated product renders—often appear without a relationship to the product.

This release teaches every L.S.Design specialist to recognize that convergence, trace design choices to real evidence, and keep only the techniques that strengthen the product's identity and use.

## Natural color and humanization

- Natural, material-derived color is now the contextual default.
- Existing brand palettes, explicit user direction, accessibility, and functional states still take priority.
- Color guidance covers semantic roles, tinted neutrals, restrained accents, OKLCH, `color-mix()`, and responsible use of glow or fluorescence.
- A required acceptance gate checks motif restraint, content-led geometry, product-specific language, physical context, composition rhythm, and ordinary interface states.

The rules do not ban vivid color or any individual design technique. They require a reason when several familiar trend signals appear together.

## Advanced layout expertise

The suite now uses a native-first layout decision ladder covering intrinsic flow, Flexbox, Grid, subgrid, container queries, editorial shapes, anchor positioning, view transitions, and responsive recomposition.

It also explains when a project may benefit from EGJS Grid, Floating UI, Motion, AutoAnimate, React Grid Layout, React Three UIKit, or Yoga. L.S.Design installs none of these packages. A generated project adds one only for a concrete runtime need with accessibility, fallback, licensing, and client-cost review.

## Better product 3D

The 3D specialist now gives clearer direction for product scenes:

- Establish silhouette, scale, useful viewpoint, contact, and material-readable lighting first.
- Use guided camera movement when unrestricted orbiting adds no value.
- Apply fabric sheen, brushed-metal anisotropy, bloom, and emissive effects only when the material or art direction supports them.
- Avoid constant rotation, particles, and camera drift that do not explain the product.
- Render static scenes on demand and preserve a useful DOM experience and static fallback.
- Distinguish real renderer-based 3D from CSS or SVG depth honestly.

## Stable public interface

The release keeps the same nine skill names, provider-neutral Markdown format, installer commands, and Codex-compatible and Claude Code installation layouts. It adds no dependency to the skill suite itself.

## Validation

Version 1.1.0 adds machine-readable shared-reference coverage and regression tests ensuring that every specialist uses the same color, humanization, and layout policies. The release is checked with structural validation, source scanning, complete unit tests, checksum-matched provider installations, and the controlled Orbit One website-versus-3D exercise.

The [v1.1.0 benchmark evidence](docs/V1.1.0_BENCHMARK.md) records the controlled prompt checksum, toolchain, dependencies, builds, browser checks, visual scores, delivery costs, and environment limitation.

## Upgrade

Pull or clone the tagged release, then replace the existing installation intentionally:

```sh
python scripts/install.py --provider both --scope global --force
```

Use `--target /path/to/project` instead of `--scope global` for a project-local installation.

## Compatibility

- Python 3.9 or newer for repository scripts
- Provider-neutral Markdown skill format
- Codex-compatible `.agents/skills` layout
- Claude Code `.claude/skills` layout

## License

Apache License 2.0. Research sources and evidence boundaries are documented in `THIRD_PARTY_NOTICES.md`.
