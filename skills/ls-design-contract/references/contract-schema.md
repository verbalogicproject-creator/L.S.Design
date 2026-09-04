# Contract schema

Field-by-field detail for `design/DESIGN.md`, plus the concept mapping that lets one contract be implemented in any stack.

## Frontmatter

The frontmatter is a valid public design.md document. Only `name` is required.

```yaml
name: Orbit One
description: A compact tabletop speaker, sculptural and quiet.
version: "1.0"
colors:
  background: "#F7F5F2"
  surface: "#FFFFFF"
  content: "#1A1917"
  content-muted: "#5C574F"
  border: "#E2DED6"
  primary: "#2F6F5E"
  on-primary: "#FFFFFF"
  accent: "#C4703A"
  success: "#2E7D52"
  warning: "#9A6B12"
  danger: "#A33224"
  focus: "#2F6F5E"
  dark-background: "#151412"
  dark-surface: "#1F1E1B"
  dark-content: "#F2EFE9"
  dark-content-muted: "#A8A296"
  dark-border: "#35332E"
  dark-primary: "#6FBFA5"
  dark-on-primary: "#10201B"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "0.25rem"
  md: "0.625rem"
  lg: "1.25rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2.5rem"
  xl: "4rem"
components:
  button:
    background: "{colors.primary}"
    color: "{colors.on-primary}"
    borderRadius: "{rounded.full}"
```

### Rules for the frontmatter

- **Token names are free-form.** Use semantic role names, not literal color names. `primary` and `danger` survive a rebrand; `green` and `red` do not.
- **Dark mode uses the `dark-` prefix inside the same flat `colors` map.** `dark-surface` is the dark twin of `surface`. A token with no twin inherits its light value in dark mode. This keeps the document inside the public format, which has no nested light and dark structure.
- **Contrast is verified, not assumed.** Every foreground-background pair that appears in the interface is checked before the value is written: 4.5:1 for body text, 3:1 for large text and interface components. The generated preview recomputes these in the browser so a value that drifts is caught.
- **Typography roles, not sizes.** Name a role — `display`, `h1`, `h2`, `h3`, `body`, `body-small`, `caption`, `label`, `mono` — and give it the family, size, weight, line height, and tracking it needs. Roles map to elements in code; raw sizes do not.
- **`components` uses `{colors.x}`, `{rounded.x}`, and `{spacing.x}` references** rather than repeated literals, so a token change propagates.
- **No suite-specific keys in the frontmatter.** Status, approval log, revision history, and screen state live in `design/design.json`, which keeps `DESIGN.md` portable to any tool that reads the public format.

## Prose sections

The body of `DESIGN.md` follows the public format's section names so an external reader recognizes it, and carries the decisions a token map cannot express.

### Overview

The premise in one sentence — audience, intended feeling, and the visual behavior that supports it — with the evidence it rests on named: brand assets, existing content, a conversation with the user. Then the direction: one primary family drawn from [direction families](../../ls-design-art-direction/references/direction-families.md), one quiet counterpoint, the signature element, and an explicit list of what is excluded.

### Colors

How the roles are meant to be used, not a restatement of the hex values. Which surfaces stack, where the accent is allowed to appear and how often, what carries state, and which pairs were contrast-verified at which ratio.

### Typography

The pairing and why it fits the product, the role-to-element mapping, measure targets, and any script-specific rule the project needs — see [rtl foundations](../../ls-design/references/rtl-foundations.md) when a right-to-left locale is in scope.

### Layout and Spacing

Page-level layout templates, each with named slots:

| Template | Purpose | Slots |
|---|---|---|
| Base | Root shell: `lang` and `dir`, skip link, semantic landmarks | head, header, main, footer |
| Marketing | Campaign and product pages | hero, sections[], cta, footer |
| App | Signed-in product surface | nav, sidebar, main, panel |
| Docs | Long-form documentation and editorial | toc, article, related |

Plus the grid, the container widths, the breakpoint intent, and the spacing rhythm the scale expresses.

### Elevation and Depth

The elevation steps, what each one means semantically, and whether shadows carry a consistent light direction. Shadow offsets are physical; if the project ships a right-to-left locale, either keep offsets symmetric or supply a direction-specific override.

### Shapes

The radius scale and which components use which step, plus any signature shape treatment — a cut corner, a specific aspect ratio, a mask.

### Components

Each meaningful component as a contract:

| Field | Content |
|---|---|
| Purpose | The one job it does |
| Anatomy | Its parts, named |
| Variants | The permitted variants, and nothing beyond them |
| Sizes | The permitted sizes |
| States | Rest, hover, focus, active, disabled, loading, error, empty |
| Keyboard | Which keys do what, and where focus goes |
| Mirrors | Whether it mirrors under a right-to-left direction, and why |
| Behavior | Static markup, or interactive with a named hydration trigger |
| Without scripting | What a user sees if client-side behavior never loads |

The behavior field carries the most weight for performance. **Static** means markup and CSS only, no client-side scripting. **Interactive** means it genuinely needs scripting, and names when that scripting arrives: on load, when the browser is idle, when the component scrolls into view, or on first interaction. Defaulting everything to interactive is the single most common cost mistake in a component contract.

### Content schemas

For each content type, the fields it accepts: name, type, required or optional, maximum length, and **provenance**. A testimonial, a statistic, an award, or a customer logo must cite a real source. A field with no real source is left out of the build, not filled with something plausible.

### Voice and action vocabulary

Copy decisions are contract decisions. Recording them here is what stops each session re-inventing the tone, in the same way recorded palette roles stop it re-inventing the colors.

Carry three things. **Voice** in one line: who the interface sounds like and what it never does. **Casing**, stated once and obeyed everywhere — heading case, label case, action case. And an **action vocabulary**: the verb for each recurring action, with the confirmation it produces, so the chain holds across the flow.

| Action | Label | Confirmation | Used at |
|---|---|---|---|
| publish a draft | `Publish` | `Published` | editor, review dialog |
| save a change | `Save changes` | `Saved` | every settings surface |

One verb per intent across the whole product. Where the contract already names a verb, a later stage uses that verb rather than a synonym. Record the error and empty-state patterns here too when the product has recurring ones. Read [interface copy](../../ls-design/references/interface-copy.md) for the rules these fields record.

### States

Loading, empty, error, offline, long content, and — for a bilingual or localized interface — text expansion.

### Accessibility

The conformance baseline, the target level, focus behavior, target sizes, the reduced-motion rule, and any statement page the project must carry.

### Acceptance

Measurable criteria, for example: zero horizontal overflow at 360, 768, and 1440 pixels; exactly one `h1` per page; the skip link is the first tab stop; every contrast pair passes; zero unjustified physical directional CSS in new code; zero Unicode bidirectional control characters in source; reduced motion respected; and the performance targets the project commits to.

### Do's and Don'ts

Short, specific, and drawn from this project rather than generic advice. The don'ts are the more useful half: name the treatments this design deliberately rejects, so a later session does not reintroduce them.

## Concept mapping

| Concept | React or a similar framework | Plain HTML |
|---|---|---|
| Layout template | A layout or wrapper component | A repeated HTML shell with includes or partials |
| Interactive component | A client component with an explicit boundary | An isolated script bound to a `data-` attribute |
| Content schema | A typed schema validated at build time | Structured JSON or YAML files against a documented schema |
| Static shell | A server-rendered or statically generated page | Ordinary static HTML |
| Token | A CSS custom property, optionally bridged into the framework theme | A CSS custom property |

## Relationship to `design/design.json`

`design.json` is written and owned by the studio server. It records screens and their revisions, the approve or reject decision on each, queued generation requests, the gate state, and provenance hashes of the contract files. Read it to learn what was approved. Do not hand-edit it while a studio server is running on that folder — the server is the single writer.
