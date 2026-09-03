# The handoff contract

`design/handoff/` is the frozen, gate-guarded snapshot that `ls-design-studio` releases and
`ls-design-build` implements. This document is the authoritative description of its shape: the
folder tree, each file's format, the gate that produces it, what `--force` changes, and what the
builder is required to do with each part.

The code that writes it is
[`studio/server/handoff/export.ts`](../studio/server/handoff/export.ts),
[`studio/server/handoff/brief.ts`](../studio/server/handoff/brief.ts), and
[`studio/server/handoff/fixtures.ts`](../studio/server/handoff/fixtures.ts). The skill that reads
it is [`skills/ls-design-build/SKILL.md`](../skills/ls-design-build/SKILL.md).

## Why a handoff exists at all

`design/` is a live working folder: a person can reject a screen or edit a token at any time, and
the moment either happens the live folder no longer describes an approved state. The handoff
exists so a builder has something safe to build against regardless of what happens in `design/`
afterward — a snapshot taken at the instant the gate passed, copied out rather than referenced, so
nothing in it moves again once it is written.

## The folder tree

```text
design/handoff/
  BRIEF.md              the premise, target stack, approved screens, token rules,
                         fixture quarantine, offline note, build route, and provenance
  DESIGN.md              copy of the frozen contract at export time
  design.json            copy of the full design state at export time
  tokens.css             copy of the frozen generated stylesheet
  tailwind.theme.css     copy of the frozen framework theme bridge
  screens.json           one entry per approved screen: id, slug, title, device,
                         width, height, revision, source, file paths, decision
  screens/
    <slug>/
      code.html          the approved screen's HTML
      screen.png         the approved screen's PNG — the visual record of record
  fixtures/
    <slug>.json          quarantined invented values found in that screen's HTML
  target_stack.json       {"framework","styling","typescript","tokensVia","routerSkill"}
  handoff.sha256          one "<sha256>  <relative-path>" line per file above, sorted
```

Every screen directory and fixture file is named after the screen's slug, matching the slug used
under `design/screens/<slug>/` in the live folder. `DESIGN.md`, `tokens.css`, and
`tailwind.theme.css` are copied only if they exist at export time; every other listed file is
always written, even when there is nothing to report (an empty `screens.json` array, or a fixture
file with an empty findings array).

## `BRIEF.md`'s eight sections

`BRIEF.md` is generated, not hand-written, and always has these eight numbered sections in this
order:

1. **Premise.** Extracted from `DESIGN.md`'s Overview section (the text following
   `**Premise.**`), falling back to the frontmatter's `description`, and finally to the literal
   text "Not recorded in the contract." if neither is present.
2. **Target stack.** A table rendered from `target_stack.json`'s key-value pairs.
3. **Screens.** A table of every approved screen — slug, title, device, size, revision, source
   kind — or a single "_none_" row if none are approved. (An unpassed gate means this table can
   legitimately be empty; see "What `--force` stamps," below.)
4. **Token rules.** A fixed statement that the contract is law: every color, size, radius, and
   font comes from the `--ls-*` custom properties or the framework theme; a needed value the
   contract lacks is a contract change, not a local literal; component variants and states are the
   ones the contract lists.
5. **Fixture quarantine.** Either "No fixture values were detected." or a table of quarantined
   value counts per screen slug, followed by the instruction to replace every quarantined value
   with real content or an explicit empty state before release.
6. **Offline note.** States that `screen.png` is the visual record of record because the
   generated HTML may need network access for its CDN scripts, fonts, and images, and records
   whether the network was actually reachable at export time.
7. **Build route.** Names the router skill from `target_stack.json`'s `routerSkill` field (for
   the default stack, `ls-design-websites`), and states that the build finishes with a screenshot
   pass at 360/768/1440 pixels and a closing `ls-design-review` pass.
8. **Provenance.** The sha256 of `DESIGN.md`, `tokens.css`, and `preview.html` as recorded in
   `design.json`'s provenance map at export time, the tokens hash, the state revision number, and
   the export timestamp.

If the gate had not actually passed at export time, `BRIEF.md` carries one more line before its
own heading: a blockquote reading `GATE NOT PASSED — this handoff is provisional and must not be
treated as approved.`

## `screens.json`'s shape

A JSON array, one object per approved screen, in this shape:

```json
[
  {
    "id": "scr_a1b2c3d4",
    "slug": "product-hero",
    "title": "Product hero",
    "device": "desktop",
    "width": 1440,
    "height": 1024,
    "revision": 3,
    "source": { "kind": "agent" },
    "files": { "html": "screens/product-hero/code.html", "png": "screens/product-hero/screen.png" },
    "decision": { "state": "approved", "notes": "", "at": "2026-09-02T10:15:00.000Z", "by": "human" }
  }
]
```

`files.html` and `files.png` are paths relative to `design/handoff/` itself, matching the actual
copied locations under `screens/<slug>/`, not the revisioned `screens/<slug>/r<N>/` paths used
inside the live `design/` folder — the handoff keeps only the one approved revision of each
screen, under its slug, with no revision number in the path.

## `fixtures/<slug>.json` and why fixture quarantine exists

Generated screens invent plausible content: prices, star ratings, customer counts, testimonial
quotations, and testimonial names, because a screen generator has no access to a project's real
data. Left alone, this content looks finished enough to ship by accident. `design/handoff/fixtures/<slug>.json`
exists to make that impossible to miss: it is the exact list of values `detectFixtures` found in
that screen's approved HTML, so the builder can recognize each one and replace it with real
content or an explicit empty state, rather than something merely plausible.

Each entry has this shape:

```json
{ "kind": "price", "value": "$249", "context": "Starting at $249 with a two-year warranty" }
```

`kind` is one of `price`, `rating`, `count`, `quote`, `name`, or `logo`. `context` is up to 120
characters of surrounding text, so the builder can find the value's actual location without
re-searching the whole screen. A screen with no detected fixtures still gets a `fixtures/<slug>.json`
file — it is simply an empty array — so the builder can rely on the file always existing rather
than treating its absence as meaningful.

## `target_stack.json`

The default and, at the time of writing, only stack `ls-design-studio` emits:

```json
{
  "framework": "vite-react",
  "styling": "tailwind-v4",
  "typescript": true,
  "tokensVia": "css-vars",
  "routerSkill": "ls-design-websites"
}
```

`routerSkill` is what `ls-design-build` reads to decide which craft specialist to load after
fidelity to the contract is established — `ls-design-websites` for a multi-section site,
`ls-design-landing-pages` for a single conversion page, `ls-design-mobile` for a mobile surface,
`ls-design-3d-web` when the design calls for a spatial representation. See
[`skills/ls-design-build/references/vite-react-tailwind.md`](../skills/ls-design-build/references/vite-react-tailwind.md)
for the concrete scaffold this default stack expects.

## `handoff.sha256` and how to verify it

`handoff.sha256` is a checksum manifest of every file written into `design/handoff/` except itself,
one line per file, sorted by relative path:

```text
9f2c1e...  BRIEF.md
4a7bd0...  DESIGN.md
...
b6e912...  screens/product-hero/code.html
c103aa...  screens/product-hero/screen.png
```

Verify the whole folder matches the manifest by running, from inside `design/handoff/`:

```bash
sha256sum -c handoff.sha256
```

A clean run reports every file as `OK`. Any file that has been edited, added outside the export
process, or gone missing since the handoff was written is reported as failed or missing by the
same command — that is the manifest's whole purpose: a builder (or anyone reviewing the handoff
later) can confirm the folder is exactly what the gate produced, without trusting that nobody
touched it in between.

## The gate conditions

`design/handoff/` is written only when all four of these hold:

1. There is at least one screen.
2. Every screen's decision is `approved` — none pending, none rejected.
3. No screen is marked stale against the current token hash.
4. No `reapply_design_system` request is still pending or claimed.

## What `--force` stamps

Passing `--force` on the CLI's `handoff` command, `force: true` on the `POST /api/handoff` route,
or `force: true` on the `studio_export_handoff` MCP tool writes the handoff even when the gate
above is not satisfied. The written `BRIEF.md` is stamped, as the very first line of the file,
with a blockquote: `GATE NOT PASSED — this handoff is provisional and must not be treated as
approved.` Nothing else about the folder's shape changes — the same files are written in the same
places, with whatever subset of screens happens to be approved at that moment (which may be none).
A forced export is a deliberate escape hatch for a person who wants to hand over partial or
unapproved work anyway; the stamp exists so that decision is never silently lost on the way to the
builder.

## What `ls-design-build` is required to do with each part

- **Read `BRIEF.md` first**, before touching any other file. It names the premise, the target
  stack, the approved screens, the token rules, which content is quarantined fixture data, and
  which build specialist to route through.
- **Treat everything in `design/handoff/` as frozen**, even if the live `design/` folder has since
  moved on — the handoff is what to build against, not the live folder.
- **Scaffold the stack named in `target_stack.json`.** Import `tailwind.theme.css`, which imports
  `tokens.css`; do not start a parallel token system.
- **Study each approved screen as a pair.** The PNG is the visual record; the HTML shows the
  structure that produced it. Reproduce the composition and hierarchy without copying the
  generated markup wholesale — it usually carries a generator's own utility soup and remote asset
  references that do not belong in the shipped build.
- **Replace every fixture** listed in `fixtures/<slug>.json` with real content or an explicit
  empty state. None of them ship as an invented, merely plausible value.
- **Treat the contract as law**, exactly as the token rules section states: no raw color, size, or
  radius literal outside the token files; a genuinely needed new value is a contract change, made
  in `DESIGN.md` and regenerated, never added locally.
- **Run the production build**, fix every error, and capture screenshots at 360, 768, and 1440
  pixels into the build's own evidence folder, as named in
  [`skills/ls-design-build/references/vite-react-tailwind.md`](../skills/ls-design-build/references/vite-react-tailwind.md).
- **Close with `ls-design-review`**, scored against the contract's own acceptance criteria.
