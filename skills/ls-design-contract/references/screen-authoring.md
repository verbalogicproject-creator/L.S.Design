# Screen authoring

What makes a screen token-driven, and the rules a token-driven screen must follow so a token edit can repaint it without an agent in the loop.

## Token-driven versus baked

A token-driven screen is HTML the coding agent authors directly, linking the project's own `design/tokens.css` and expressing every color, type role, radius, and spacing value as `var(--ls-*)`. Because the browser resolves those custom properties at paint time, editing a token in the studio repaints every token-driven screen immediately; the screen never goes stale and no reapplication is ever queued for it.

A baked screen is produced by an external screen-generation service — Google Stitch is the one this suite targets — which returns HTML with colors and fonts already resolved to literal values, plus a captured PNG. A token edit cannot repaint a baked screen, so the studio marks it stale and queues a reapplication; see the studio's orchestration protocol for that round-trip. Both kinds of screen remain valid: use a baked screen when an external generator is the source, and author token-driven when the coding agent generates the screen directly.

## Rules for a token-driven screen

- Link `design/tokens.css` with a relative `<link>` in the document head. Do not inline a copy of the tokens — the whole point is that the same file backs the studio, this screen, and eventually the build.
- Every color, type size, weight, line height, letter spacing, radius, and spacing value resolves through a `var(--ls-*)` custom property. A hex literal, an `rgb()` or `hsl()` literal, or a bare pixel size where a token exists is a defect, not a shortcut.
- No remote font and no font-service link. If the contract's typography names a font family, self-host it or fall back to the system stack named alongside it in `tokens.css`.
- No CDN script or stylesheet. The screen is self-contained apart from the one relative link to `tokens.css`, so it renders identically offline and inside the studio's canvas.
- Content is real or an explicitly labeled stand-in, following the same provenance rule as the contract itself.
- Record on the screen that it was authored directly rather than pulled from a generator, so the gate and the handoff tooling can tell it apart from a baked screen.

## Why it matters beyond the studio

The build in `ls-design-build` imports the same `tokens.css` the studio and the screen used. A token-driven approved screen and the shipped interface are two renders of one file, so there is no drift to compare by eye. A baked screen's fidelity to the build still has to be checked that way, because its literals were captured once and can silently diverge from the tokens that exist now.
