# Preview artifact

What `design/preview.html` must show, and the verification protocol to run against it before a contract is marked approved.

## File shape

One self-contained HTML file: `<html lang="…" dir="…">` with inline CSS and inline JavaScript and no remote script source. A stylesheet link to a font service is permitted, and the file must still be correct when that link fails — a system-font fallback toggle proves it. Project tokens are inlined directly so the file opens from the filesystem with no server. The file honors `prefers-color-scheme` and a manual theme toggle.

The preview is generated from the contract frontmatter. When the tokens change, regenerate it; do not patch it by hand.

## Required sections

1. **Header.** Project name, contract status, theme toggle, a direction toggle that flips only the demonstration root rather than the whole document, and a font-loading readout from `document.fonts`.
2. **Contract summary.** Premise, direction, signature element, and jump links to every section below.
3. **Colors.** A swatch per role in each theme, showing the authored value and the computed value resolved through `getComputedStyle`, with the WCAG contrast ratio calculated in JavaScript and a pass or fail tag against the correct threshold — 4.5:1 for body text, 3:1 for large text and interface components.
4. **Typography.** The scale rendered in the chosen faces; a pangram; a paragraph at the real measure; mixed-direction lines where the project is localized — a brand name inside a sentence, a phone number in an isolated `dir="ltr"` span, a formatted price, a formatted date, a username in `<bdi>`; and an emphasis line proving emphasis renders the way the contract says it should.
5. **Spacing, radii, and elevation.** Swatches for every step of each scale, with the elevation samples shown in both directions when a locale flips.
6. **Motion.** One micro-interaction that honors `prefers-reduced-motion`, sliding from the logical start edge rather than a fixed physical side.
7. **Mirroring.** A table of element, mirrors or not, and the reason; plus a live SVG demonstration driven by `[dir="rtl"] .mirror { transform: scaleX(-1) }`. Clocks, refresh arrows, media transport controls, and checkmarks do not mirror. A progress bar, breadcrumb, pagination, and slider do.
8. **Layouts.** Three `container-type: inline-size` frames at 360, 768, and 1440 pixels, stacking on a narrow viewport: navigation plus hero, a form with required markers at the logical start and left-to-right inputs where the content demands it, a card grid, a numeric table, and a footer. No iframes.
9. **Mixed-direction stress test.** URLs, parentheses, percentages, negative numbers, ranges, times, email addresses, hashtags, and numbered lists in one block, so the bidirectional algorithm is exercised rather than assumed.
10. **Accessibility checklist.** `lang` and `dir`, skip link, a visible focus demonstration, 24-pixel target sizes, the contrast summary, and a link to the accessibility statement.
11. **Self-check panel, in JavaScript.** Counts Unicode bidirectional control characters in `body.innerText` — which must be zero; measures horizontal overflow in every frame; counts contrast failures; reports how many fonts loaded; and scans the inline stylesheet for physical directional properties, skipping any line marked `physical-ok`.
12. **Footer.** How to regenerate the file, and the approval log.

## Verification protocol

Before setting the contract's status to approved:

1. Open the preview in a browser. If rendering is not available in the environment, hand the file to the user and record that the check was a handoff rather than an actual render.
2. Confirm the layout renders correctly in the project's reading direction: text direction, alignment, and tab order.
3. Confirm every contrast row reads as passing.
4. Confirm zero horizontal overflow at all three widths.
5. Confirm the theme toggle works and both themes are correct — not merely legible, but intentional.
6. Confirm the self-check panel reports zero bidirectional control characters and zero unjustified physical directional properties.
7. Disable the font link and confirm the fallback stack still holds the design together.
8. Record the outcome in the approval log inside the contract: who checked, when, at which widths and themes, and whether the check was an actual render or a handoff.

A contract whose preview was never opened is a draft, whatever its status field says.
