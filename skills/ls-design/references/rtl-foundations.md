# Right-to-left foundations

Use this reference on any work that may ship in a right-to-left locale — Arabic, Hebrew, Persian, Urdu, Divehi, and others — and on any component library intended to be locale-portable. The rule this reference exists to enforce: real right-to-left support is not `dir="rtl"` applied to a left-to-right layout. It is built from logical properties from the start, and it costs almost nothing when done that way.

This reference is script-agnostic. It carries no locale packs, no font recommendations for a specific language, and no country-specific formatting rules. A localized fork of this suite adds those; this reference gives the mechanics that hold everywhere.

## The foundation: directionality at the tag level, not the character level

- Set `dir` and `lang` on the `<html>` element. Do not rely on CSS alone to establish direction — CSS can style a direction but cannot tell assistive technology or the bidirectional algorithm what the content actually is.
- **Never use Unicode bidirectional control characters** — LRE, RLE, PDF, LRO, RLO in the U+202A–U+202E range, and LRI, RLI, FSI, PDI in U+2066–U+2069. This suite's validator rejects them outright. They are also dangerous in their own right: invisible in most editors, they create rendering bugs that are hard to locate and can be used to disguise what a line of text or source code actually says.
- For correct isolation, use the `<bdi>` element (usernames, user-supplied strings, any text of unknown direction), `unicode-bidi: isolate` in CSS, and an explicit `dir="ltr"` on deliberately left-to-right content such as phone numbers, email addresses, URLs, and code.
- The Unicode direction *marks* LRM (U+200E) and RLM (U+200F) are technically permitted by the validator, but prefer a tag-level solution over depending on them.

## Logical properties only — never physical direction

This is the most important mechanical rule. In all new CSS:

| Never | Always |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `left:` / `right:` | `inset-inline-start:` / `inset-inline-end:` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `float: left` / `right` | Prefer Flexbox or Grid with a sensible `flex-direction` |
| `border-radius` corner shorthands | `border-start-start-radius` and its logical siblings |
| `width` / `height` on flow-sensitive boxes | `inline-size` / `block-size` |

**The justified exception:** `box-shadow`, `text-shadow`, `linear-gradient`, and `transform` stay physical. A `4px 4px` offset does not flip when `dir` changes. If a shadow is meant to express a consistent light direction, test it explicitly under `[dir="rtl"]` and supply an override where it matters. Mark such a line `physical-ok` with a short reason so a reviewer and the token lint both know the physical value is deliberate.

Tailwind v4 emits logical properties for its `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*` utilities. Prefer those over `ml-*`/`mr-*`/`pl-*`/`pr-*`/`left-*`/`right-*` in any locale-portable component.

## What mirrors and what does not

Following the bidirectionality guidance shared by Material Design and the Apple Human Interface Guidelines:

**Mirrors:**
- Directional navigation icons: back and forward, a "continue" arrow, an expansion chevron.
- Linear progress bars, breadcrumbs, and pagination.
- Volume and level indicators whose slider sits alongside the wave — slider and wave flip together.
- Calendars — the days run from the reading start edge.
- A linear timeline, meaning a horizontal sequence of events.
- Secondary navigation and the button order inside an action bar.

**Does not mirror:**
- Clocks and any icon built from a circular arrow — refresh, history, sync, undo. Clockwise stays clockwise in every language.
- Media transport controls (play, pause, fast-forward, rewind). They express the direction of the media, not the direction of reading.
- Physical objects and non-directional glyphs: keyboard, headphones, camera, checkmark.
- Numbers, prices, phone numbers, and URLs — these stay left-to-right and are isolated with `<bdi>` or `dir="ltr"`.
- Data charts and graphs. Do not flip by default; flip only when the underlying data has a reading-order meaning and a person who reads the locale confirms it.
- Logos and brand marks in a left-to-right script — leave them as they are, wrapped in `dir="ltr"` where needed.

When uncertain, check with someone who actually reads the language. Not every edge case is settled by a rule.

## Typography under a different script

Type decisions that hold across scripts, without naming a locale:

- **Italics are not universal emphasis.** Several scripts, Hebrew among them, do not use a slanted face for emphasis; weight or color carries it instead. If a component library hard-codes `font-style: italic` for emphasis, make it a token so a locale can map it to weight.
- **Letter-spacing is not universal either.** Connected scripts such as Arabic break when letters are tracked apart; positive or negative tracking on such text is a defect, not a style. Keep tracking a role token with a default of `0` for non-Latin body text.
- **Line height usually needs more room.** Scripts with tall ascenders, deep descenders, or optional diacritics read better at 1.5–1.7 for body text rather than the tighter Latin default.
- **Base size often needs to be larger** — commonly ten to fifteen percent — for equivalent legibility.
- **Justification without hyphenation.** Many scripts do not break words with a hyphen at line end; the only break points are between words. Do not turn on automatic hyphenation globally.
- **Font stacks must include a real fallback for the script**, and the design must survive that fallback. Confirm it by disabling the web fonts and looking at the result.

## Forms, input, and numbers

- Field labels align to the logical start (`text-align: start`), never a fixed physical side.
- Inputs whose content is inherently left-to-right — phone, email, credit card, URL, code — take `dir="ltr"` on the input element itself, so the caret and character placement behave correctly while the surrounding form stays in the page direction.
- Required-field markers sit at the logical start or end consistently, chosen once and applied everywhere.
- Error messages render in the page direction, with any embedded left-to-right token (a technical field name, a file path) isolated in `<bdi>`.
- Numeric alignment in tables: align numbers to the logical end, and keep digits in a consistent numeral system across the whole interface.

## Quick acceptance check

Before delivering an interface intended for a right-to-left locale, confirm: `dir` and `lang` are set on the root element; zero physical directional CSS properties without a justified `physical-ok` note; zero Unicode bidirectional control characters in source; all embedded left-to-right content isolated; tab order flows from the reading start edge; no slanted face applied to a script that does not use one; and an actual visual check of the layout at 360, 768, and 1440 pixels — not a code reading alone.

For the artifact that automates most of this check, see the preview described in [design contract](design-contract.md).
