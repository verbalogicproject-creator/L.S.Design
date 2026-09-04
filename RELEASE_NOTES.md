# L.S.Design v2.1.0 — Words, concrete tells, and an installer that installs cleanly

v2.0.0 gave the suite a contract, a studio, and a builder. v2.1.0 fixes what that release
got wrong on the way to a user's machine, and closes the two largest gaps in what the
skills actually say.

## The installer now installs what it claims

Three defects, all of which only appeared once the suite was installed rather than read
in the repository.

`ls-design-review` pointed at the comparison test through a path that climbed above
`skills/`. The installer copies `skills/` alone, so that link resolved to nothing on every
install ever made, and the review skill's own scoring method was unreachable. The thirteen
scoring areas now live in `references/review-scorecard.md`, inside the skill that uses them.

The installer copied whole directories without filtering, so local tooling artifacts
travelled into user installs. It now excludes them from both the copy and the checksum,
which are required to agree.

`scripts/validate.py` never caught the broken link because it validated the source layout,
where `skills/../../docs/` does exist. It now rejects any relative link that escapes the
skills tree, with a regression test that fails when the original bug is reintroduced.

`python scripts/install.py --skip NAME` leaves a named skill uninstalled. Repeat it to skip
more than one.

## Words are design content

The suite scored whether an empty state existed. Nothing scored whether its words did any
work. `interface-copy.md` is the sixth shared reference, consumed by all twelve skills: name
things as the user understands them, keep one verb per intent through a whole flow, write
errors that name the next step, treat an empty screen as an invitation rather than a status
message, and never present invented precision as fact.

It is enforced in two more places. `ls-design-contract` records the project's voice and its
action vocabulary, so a verb decided once is inherited downstream the way palette roles are.
`ls-design-review` scores interface copy as a coverage area.

## The convergence check became countable

The humanization gate described a bundle of trend signals. A bundle is a judgement; a count
is a check. `natural-color-and-humanization.md` now carries a table of observations with
thresholds, and names the palette and display faces that generated design converged on, so a
match is mechanical rather than a matter of taste.

The rule class did not change. These remain anti-pattern warnings — a signal to inspect
intent, never a prohibition. A brief that asks for one of them wins outright, as it always
did. What is new is that the observation is countable while the verdict stays contextual.

Three motifs moved deliberately into the bundle rather than onto any list of defects:
tinted near-black over pure black, monospace for labels, and a trailing arrow on link text.
Each is correct under a stated condition and generic without it, so the reference names the
condition instead of the motif.

## Three named 3D anti-patterns

`ls-design-3d-web` already forbade user-agent sniffing as a quality strategy and required a
reduced-motion path. `production-3d.md` now names the concrete shapes those failures take in
widely copied example code — a platform-string test standing in for a frame budget, a
device-pixel-ratio cap pasted as policy, hover as an entire interaction model, and an
animation loop with no motion-preference gate.

## Upgrading from v2.0.0

Nothing breaks. No skill was renamed, no description changed, and nothing was removed, so
skill selection behaves exactly as before. Every skill gained one link. Reinstall with
`--force`.

---

## Previously: v2.0.0 — the design contract, the studio, and the build pipeline

v1.x taught a coding agent how to make good design decisions. It never wrote anything down. Every session re-derived the greys, re-picked the spacing rhythm, re-invented the focus treatment — each defensible alone, incoherent together — and nobody ever looked at the result before it became code.

v2.0.0 closes that loop. The suite now emits an artifact, puts a person in front of the screens, and hands an approved snapshot to a builder.

### The pipeline

```text
ls-design-contract  ->  ls-design-studio  ->  ls-design-build  ->  ls-design-review
   DESIGN.md              approve or            implement            score against
   tokens.css             reject screens        the handoff          the contract
   preview.html           release handoff
```

Each stage leaves an artifact the next one reads. Skip a stage when the work does not need it — a small fix inside a product that already has tokens goes straight to the relevant specialist. A project with no contract and more than one surface should not skip the first.

### The design contract

`ls-design-contract` writes `design/DESIGN.md`: YAML frontmatter of tokens in the public design.md format, plus prose for everything a token map cannot express — the premise and its evidence, the direction and what it excludes, layout templates with named slots, components as contracts with their states and keyboard behaviour, content schemas with provenance, and measurable acceptance criteria.

The file stays portable. It carries no suite-specific stamps, so any tool that reads the public design.md format can consume it. Everything this suite needs beyond that format lives in `design/design.json`.

Dark mode fits inside the flat format through a `dark-` prefix: `dark-surface` is the dark twin of `surface`, and a role with no twin inherits its light value. When an external generator needs the document, `ls-design-studio tokens --emit stitch` strips the twins so the generator sees a clean spec while `DESIGN.md` remains the single source of truth.

From the frontmatter the suite generates `tokens.css` — logical CSS properties only, under an `--ls-` prefix that keeps the contract clear of a framework's own namespace — a framework theme bridge, and `preview.html`: one self-contained file that opens from the filesystem, recomputes every contrast ratio in the browser, measures overflow at 360, 768, and 1440 pixels, and reports zero bidirectional control characters. A contract whose preview was never opened is a draft, whatever its status field says.

The default palette that ships with the template passes every one of its seven declared contrast pairs, checked in both themes for fourteen passing results. Getting there required separating `border` from `border-strong`: a decorative hairline between two surfaces is deliberately subtle, and a divider forced to 3:1 reads as a heavy rule; the boundary of an interactive control is where WCAG 1.4.11 actually applies, and that one is verified.

### The design studio

`ls-design-studio` is a local control room: a pan-and-zoom canvas of generated screens, a token panel with live contrast, approve or reject with notes on every screen, a request queue, and a gate.

It is not a generator and holds no API keys. Screens arrive from a screen-generation service the agent reaches over MCP, or from the agent authoring HTML directly against `tokens.css`. It is not a drawing tool either — direct manipulation is curation: arrange, compare, decide, and turn token knobs. Element-level editing is deliberately out of scope.

The interesting part is the loop. A person rejects a screen with a note; the note is copied verbatim into a queued request; the agent's `studio_wait_for_decision` returns; the agent claims the request, does the work, and posts a new revision that returns to pending. Nothing is paraphrased into a softer instruction, and no screen is ever approved on the person's behalf.

Screens paint from their stored PNG first. Generated HTML usually needs a stylesheet CDN, a font service, and remote images, so it is the PNG — not the markup — that is the visual record, and it is the PNG that survives into the handoff.

### The handoff

The gate opens only when there is at least one screen, every screen is approved, nothing is stale against the current tokens, and no token reapplication is still queued. Then `design/handoff/` is written: a brief, the frozen contract and its generated files, each approved screen as both HTML and PNG, quarantined fixtures, the target stack, and a checksum manifest.

Fixture quarantine is the part that earns its keep. Generated screens invent prices, ratings, customer counts, and testimonials. They are extracted into `fixtures/<slug>.json` so the builder can recognise them and replace them with real content or an explicit empty state, rather than shipping something plausible.

A forced export is stamped, in its first line, as not having passed the gate.

### Right-to-left, for everyone

`rtl-foundations.md` is a shared reference every skill now reads. It is script-agnostic: logical properties instead of physical ones, the mirror and never-mirror list, `<bdi>` isolation with an absolute ban on Unicode bidirectional control characters, and the typographic facts that break libraries built for Latin only — italics are not universal emphasis, letter-spacing destroys connected scripts, and line height usually needs more room.

Real right-to-left support is not `dir="rtl"` applied to a left-to-right layout. Built this way it costs almost nothing.

### What else changed

- All nine existing skills link the shared contract, core principles, and right-to-left references, and route a finished result to `ls-design-review`. `core-principles.md` is no longer reachable from the hub alone.
- `ls-design-review` verifies an implementation against the contract and the handoff when they exist, and uses the thirteen comparison areas as its literal scoring method.
- The validator scans provider markers across every reference and description, extends its hidden-character and scaffold checks to HTML, CSS, and JSON, enforces logical CSS in the contract templates, and warns on an oversized description.

### Requirements

Python 3.9 or newer for installation and validation, unchanged. Node 20 or newer **only** for the studio; the skills themselves still have no runtime dependency, and the contract can be filled in by hand from the packaged templates when Node is unavailable.

### Upgrading from v1.x

Nothing in v1.x breaks. The suite grew from nine skills to twelve, and existing skills gained links, not new obligations. The version is 2.0.0 because the suite now emits files into a project and ships a runtime — a change in kind, not in degree.
