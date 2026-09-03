# L.S.Design v2.0.0 — The Design Contract, the Studio, and the Build Pipeline

v1.x taught a coding agent how to make good design decisions. It never wrote anything down. Every session re-derived the greys, re-picked the spacing rhythm, re-invented the focus treatment — each defensible alone, incoherent together — and nobody ever looked at the result before it became code.

v2.0.0 closes that loop. The suite now emits an artifact, puts a person in front of the screens, and hands an approved snapshot to a builder.

## The pipeline

```text
ls-design-contract  ->  ls-design-studio  ->  ls-design-build  ->  ls-design-review
   DESIGN.md              approve or            implement            score against
   tokens.css             reject screens        the handoff          the contract
   preview.html           release handoff
```

Each stage leaves an artifact the next one reads. Skip a stage when the work does not need it — a small fix inside a product that already has tokens goes straight to the relevant specialist. A project with no contract and more than one surface should not skip the first.

## The design contract

`ls-design-contract` writes `design/DESIGN.md`: YAML frontmatter of tokens in the public design.md format, plus prose for everything a token map cannot express — the premise and its evidence, the direction and what it excludes, layout templates with named slots, components as contracts with their states and keyboard behaviour, content schemas with provenance, and measurable acceptance criteria.

The file stays portable. It carries no suite-specific stamps, so any tool that reads the public design.md format can consume it. Everything this suite needs beyond that format lives in `design/design.json`.

Dark mode fits inside the flat format through a `dark-` prefix: `dark-surface` is the dark twin of `surface`, and a role with no twin inherits its light value. When an external generator needs the document, `ls-design-studio tokens --emit stitch` strips the twins so the generator sees a clean spec while `DESIGN.md` remains the single source of truth.

From the frontmatter the suite generates `tokens.css` — logical CSS properties only, under an `--ls-` prefix that keeps the contract clear of a framework's own namespace — a framework theme bridge, and `preview.html`: one self-contained file that opens from the filesystem, recomputes every contrast ratio in the browser, measures overflow at 360, 768, and 1440 pixels, and reports zero bidirectional control characters. A contract whose preview was never opened is a draft, whatever its status field says.

The default palette that ships with the template passes every one of its seven declared contrast pairs, checked in both themes for fourteen passing results. Getting there required separating `border` from `border-strong`: a decorative hairline between two surfaces is deliberately subtle, and a divider forced to 3:1 reads as a heavy rule; the boundary of an interactive control is where WCAG 1.4.11 actually applies, and that one is verified.

## The design studio

`ls-design-studio` is a local control room: a pan-and-zoom canvas of generated screens, a token panel with live contrast, approve or reject with notes on every screen, a request queue, and a gate.

It is not a generator and holds no API keys. Screens arrive from a screen-generation service the agent reaches over MCP, or from the agent authoring HTML directly against `tokens.css`. It is not a drawing tool either — direct manipulation is curation: arrange, compare, decide, and turn token knobs. Element-level editing is deliberately out of scope.

The interesting part is the loop. A person rejects a screen with a note; the note is copied verbatim into a queued request; the agent's `studio_wait_for_decision` returns; the agent claims the request, does the work, and posts a new revision that returns to pending. Nothing is paraphrased into a softer instruction, and no screen is ever approved on the person's behalf.

Screens paint from their stored PNG first. Generated HTML usually needs a stylesheet CDN, a font service, and remote images, so it is the PNG — not the markup — that is the visual record, and it is the PNG that survives into the handoff.

## The handoff

The gate opens only when there is at least one screen, every screen is approved, nothing is stale against the current tokens, and no token reapplication is still queued. Then `design/handoff/` is written: a brief, the frozen contract and its generated files, each approved screen as both HTML and PNG, quarantined fixtures, the target stack, and a checksum manifest.

Fixture quarantine is the part that earns its keep. Generated screens invent prices, ratings, customer counts, and testimonials. They are extracted into `fixtures/<slug>.json` so the builder can recognise them and replace them with real content or an explicit empty state, rather than shipping something plausible.

A forced export is stamped, in its first line, as not having passed the gate.

## Right-to-left, for everyone

`rtl-foundations.md` is a shared reference every skill now reads. It is script-agnostic: logical properties instead of physical ones, the mirror and never-mirror list, `<bdi>` isolation with an absolute ban on Unicode bidirectional control characters, and the typographic facts that break libraries built for Latin only — italics are not universal emphasis, letter-spacing destroys connected scripts, and line height usually needs more room.

Real right-to-left support is not `dir="rtl"` applied to a left-to-right layout. Built this way it costs almost nothing.

## What else changed

- All nine existing skills link the shared contract, core principles, and right-to-left references, and route a finished result to `ls-design-review`. `core-principles.md` is no longer reachable from the hub alone.
- `ls-design-review` verifies an implementation against the contract and the handoff when they exist, and uses the thirteen comparison areas as its literal scoring method.
- The validator scans provider markers across every reference and description, extends its hidden-character and scaffold checks to HTML, CSS, and JSON, enforces logical CSS in the contract templates, and warns on an oversized description.

## Requirements

Python 3.9 or newer for installation and validation, unchanged. Node 20 or newer **only** for the studio; the skills themselves still have no runtime dependency, and the contract can be filled in by hand from the packaged templates when Node is unavailable.

## Upgrading from v1.x

Nothing in v1.x breaks. The suite grew from nine skills to twelve, and existing skills gained links, not new obligations. The version is 2.0.0 because the suite now emits files into a project and ships a runtime — a change in kind, not in degree.
