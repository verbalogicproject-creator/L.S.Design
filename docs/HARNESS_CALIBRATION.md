# Harness calibration log

Findings derived from building a hard case rather than transcribed from a list.
The Orbit One Spatial build (dark, 3D, mobile-first) was run specifically to
make the harness fail in ways a plan would not have predicted.

| ID | Finding | Status |
| --- | --- | --- |
| CAL-01 | Stale derived artifact after a hand-edited contract | rule registered: `provenance-drift` |
| CAL-02 | A passed gate outlived the design that earned it | **bug fixed**, 4 regression tests |
| CAL-02b | The exported handoff is not checked against live | rule registered: `handoff-stale` |
| CAL-03 | Alternatives are not first-class; blocks the M2 direction gate | open, needs a screen `kind` |

Every one is universal — none depends on the build being 3D. The rules they
imply live in `failure-modes.json` at the repo root.

---

Every gate that fired, every repair made by hand, and whether the correction
worked first time. A hand repair no gate caught is a MISSING rule. A gate that
fired but whose fix lay outside the artifact is a MIS-ROUTED rule.

Universal = also reproducible on the v1 (non-3D) build. Spatial = 3D-specific,
must not be generalised from this run alone.

---

## CAL-01 — stale generated files after a hand-edited contract — MISSING RULE — universal

**What happened.** I edited the `colors` and `typography` maps in `design/DESIGN.md`
directly on disk. `init` had already written `design/tokens.css` from the template.
Nothing reconciled them. The screen linked `tokens.css`, so it rendered in the
*template's* light palette while the contract said dark. Contrast checks passed —
because `/api/tokens` reads `DESIGN.md` fresh — so the gate was green while the
served artifact was wrong.

**How it was caught.** By looking at a screenshot. No check fired.

**Why it matters.** This is provenance drift between a contract and its generated
outputs, and it is silent: every downstream artifact inherits the wrong values while
every token-level check keeps passing.

**The rule it implies.** `design.json` already stores
`provenance{"DESIGN.md","tokens.css","tailwind.theme.css","preview.html" -> sha256}`.
Recompute and compare. Cheap, deterministic, no browser.

- rule: `provenance-drift`
- failure mode: `fm-design-system-drift`
- severity: error
- route: `retry`
- correction: "Regenerate the derived files from DESIGN.md; <file> no longer matches
  the recorded digest."

**Generalises?** Yes. Any hand edit to `DESIGN.md` without going through the API
reproduces it on any project, 3D or not.

---

## CAL-02 — a change request arrived after the gate passed — CHECKPOINT — universal

The handoff was exported, then an `edit_with_prompt` was queued against an
approved screen. The correct behaviour is that answering it creates a new
revision, resets that screen to `pending`, closes the gate, and marks the
exported handoff stale. Verify all four; a gate that stays green after its
input changed is the worst possible failure of this system.

Watch specifically: `design/handoff/` still exists on disk with the OLD screens
and its own `handoff.sha256`. Nothing currently warns that it no longer matches
the live design. That is a candidate rule: `handoff-stale`.

---

## CAL-03 — alternatives are not first-class — MISSING CAPABILITY — universal

To answer "another type of speaker" I made a comparison of three object forms.
There is nowhere to put it. Adding it via `add_screen` would place it on the
board as a *shippable* screen, so the gate would then demand its approval before
any handoff — but it is a decision aid, not a page. The only alternative is to
keep it outside the system entirely, which is what I did, so the studio has no
record that three forms were considered and two rejected.

This is precisely what the planned "three materially different directions"
stage needs, one level down: an artifact that is *compared and discarded*, not
approved and shipped.

Implies: a screen `kind` of `study | screen`, where studies are excluded from
`computeGate` but retained in `design.json` with the rejected options recorded.
Without it, the memory layer keeps only what won and forgets what was weighed.

**Generalises?** Yes, and it blocks the M2 direction gate as designed.

---

## CAL-02 RESULT — CONFIRMED BUG in v2.0.0 — universal

Revised two approved screens after the gate had passed. Half the invalidation
happened; half did not.

| Signal | After the revision | Correct? |
|---|---|---|
| `gate.canPass` | `false` | yes |
| revised screens' `decision.state` | `pending` | yes |
| `gate.passed` | **`true`** | **NO** |
| `state.status` | **`approved`** | **NO** |
| `gates.screens.handoffSha256` | still the old digest | **NO** |
| `design/handoff/` on disk | still the r1 screens | **NO** |

`computeGate` derives `canPass` freshly from the screens, which is why that
half is right. But `gates.screens.passed`, `status`, and `handoffSha256` are
*stamped* at export time and nothing un-stamps them — the same class of bug as
the `staleTokens` one fixed earlier: stamped state that outlives its cause.

**Consumer impact, not theoretical.** `ls-design-build` reads
`design/handoff/BRIEF.md`. Right now that folder describes the boxy cabinet at
r1. Building from it would ship the design the person explicitly asked to
change, while `gates.screens.passed: true` asserts it was approved.

**Rules implied**

- `gate-stamp-stale` — `gates.screens.passed` must be derived, or invalidated
  when any screen revision changes after it was stamped.
  class `invariant`, route `halt`. A gate that stays green after its input
  changed is the worst failure available to this system.
- `handoff-stale` — the exported folder's screen revisions must match live.
  class `invariant`, route `retry` ("re-export the handoff").

**Generalises?** Completely. Nothing here is 3D-specific; the v1 project would
do the same. It went unnoticed there only because nothing was revised after
the export.

---

## CAL-04 — a revision landing on a fresh approval — MISSING WARNING — universal

Timeline from the event ring:

```
09:01:23-25  three screens approved by the person
09:01:27     gate_passed, handoff_written
09:05:33     gate_invalidated, screen_updated   (an agent revision)
```

The invalidation is correct and is exactly what CAL-02's fix added. The hazard
is the person's mental model: they approved, were told the gate had passed, and
their next instruction was "build it" — while the design had silently moved
underneath them.

Nothing is wrong with the state. What is missing is that **the agent revised an
approved screen without being told that a person had just approved it.** The
agent had the information and did not use it.

Implies a check on the write path rather than a gate on the artifact: a
revision that supersedes an approval recorded within the last few minutes
should route `ask` — "this screen was approved N minutes ago; supersede it?" —
rather than silently resetting it.

- rule: `revision-supersedes-fresh-approval`
- failure mode: `fm-stale-approval-stamp`
- class: `user_overridable_preference`
- route: `ask`

**Generalises?** Yes. Any agent editing after a human decision, in any project.
This is the first finding that concerns the *order of operations between a
person and an agent* rather than the state of an artifact.

---

## CAL-05 — a contract font that nothing provides — MISSING RULE — universal

`DESIGN.md` names `Inter, system-ui, sans-serif` for every text role. The project
vendored no font at all: no `design/fonts/`, no `fonts.css`, and the exported
handoff carries neither.

Everything passed. The screens rendered, contrast passed 14/14, the screen lint
found no remote asset — because there is no asset, remote or otherwise. And
`lint-build`'s body-role check compares the page's computed family against the
contract's declared family, so both say `Inter, system-ui, sans-serif` and they
**match while neither actually loads Inter**.

On this machine "Inter" resolves to something (measured 641.72px against
711.72px for the default sans at the same size), so it looks correct here and
would silently fall back on a machine without it. That is the worst shape a
fidelity bug can take: right on the author's device, wrong everywhere else.

The v1 project got this right only because fonts were vendored deliberately;
nothing required it.

- rule: `unvendored-font-family`
- failure mode: `fm-unknown-provenance`
- class: `invariant`
- route: `retry` — "every family named in the contract must be vendored into the
  project or be a documented system stack; `Inter` is neither."

Note the check must run at the **contract** gate, not the build gate: comparing
the page against the contract cannot catch it, because both sides carry the same
unsatisfied name.

**Generalises?** Yes, and it is invisible to every check the suite currently has.

---

## CAL-06 — a green gate on a feature that never ran — MISSING RULE — universal

The most important finding of the run.

`lint-build` reported **all eight checks passing** on the Orbit One Spatial
build. Every one was true. And the page's central feature — the live 3D viewer
that the entire direction is built around — never rendered a single frame in
that environment. The gate had nothing to say about it, because nothing asks
whether the thing the page is *for* actually works.

What the checks measure is the page's contract compliance: tokens, type roles,
provenance, reachability, overflow. All necessary. None sufficient. A page can
satisfy every one of them while its reason for existing is inert.

Three real defects were found on the way there, none by a gate:

1. **Teardown treated as failure.** The renderer calls `loseContext()` during
   its own cleanup. The viewer's `webglcontextlost` handler could not tell that
   from a real loss, so it tore down the scene it had just built.
2. **A capability probe that leaked a context.** One of a browser's small
   allowance, held forever, per viewer.
3. **The fix for (2) was worse than (2).** Releasing the probe context with
   `loseContext()` makes the browser count the *page* as causing context loss;
   after a few it refuses to create any context at all — "Web page caused
   context loss and was blocked". The probe destroyed the thing it was probing
   for. The right probe creates no context.

Every one of those is invisible to a check that looks at the DOM and the tokens.

- rule: `enhancement-never-ran`
- failure mode: `fm-no-visual-verification`
- class: `invariant`
- route: `ask` — the gate cannot know whether a dead enhancement is an
  environment limit or a defect, and must not guess.

The check itself is cheap and worth building: a page declaring an enhancement
should declare how to observe it running, and the gate should confirm it did.
For a canvas: a canvas element exists, holds a context, and its frame count
advanced. For anything else: a stated observable.

**Environment note, recorded rather than worked around.** This machine renders
WebGL only through SwiftShader, a software rasteriser, and it cannot sustain
the scene. The designed fallback handled it exactly as contracted: the still
frame stayed, controls remained real buttons, and the viewer reported "Still
frame - the scene stopped and was not restarted." That the fallback is proven
under genuine failure is a real result. That the live path remains unverified
is an honest gap, and no green check anywhere says so.

**Generalises?** Yes, and it is the widest gap the suite has: it applies to any
canvas, video, map, chart, or animation — anything where the page's purpose
lives in a layer the DOM checks cannot see.
