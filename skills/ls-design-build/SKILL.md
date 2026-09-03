---
name: ls-design-build
description: Implement an approved design handoff into working code — read the frozen brief, tokens, and approved screens, then build the real interface against the contract without reinterpreting the design. Use after the design studio's gate has released a handoff folder.
---

# L.S.Design Build

Implement what was approved. The design decisions were already made and confirmed by a person; this step turns them into code without relitigating them.

## Decision order

User and repository requirements come first, followed by product and brand truth, accessibility and function, this specialist's guidance, then aesthetic defaults. Within that order, the approved handoff outranks the agent's own design preference — a disagreement with the design goes back to the studio, not into the code.

## Start here

Read `design/handoff/BRIEF.md` before anything else. It names the premise, the target stack, the approved screens, the token rules, which content is quarantined fixture data, and which build specialist to route through. Everything else in the handoff folder is frozen at the moment the gate passed, so it is safe to build against even if `design/` has since moved on.

If there is no handoff folder, this skill does not apply. Route to `ls-design-contract` to establish a contract, or to the relevant build specialist to work from the live contract directly.

## Working method

1. **Read the brief and the contract.** `BRIEF.md`, then `DESIGN.md` for intent, then `screens.json` for what each approved screen covers.
2. **Scaffold the target stack** named in `target_stack.json`. Import `tailwind.theme.css`, which imports `tokens.css`. Do not start a parallel token system.
3. **Study each approved screen** as a pair: the PNG is the visual record, the HTML shows the structure that produced it — that split describes a baked screen. A token-driven screen's HTML is the record itself, since it renders live from `tokens.css` rather than from a captured moment. Reproduce the composition and hierarchy; do not copy generated markup wholesale, because it usually carries a generator's utility soup and its remote asset references.
4. **Build section by section**, checking each against its screen at the widths the brief names.
5. **Replace every fixture.** `fixtures/` holds the invented numbers, prices, names, and quotations that appeared in generated screens. They exist so you can recognize them, not so you can ship them. Real content or an explicit empty state — never a plausible-looking invention.
6. **Run the production build** and fix every error before finishing. A build that has not compiled is not done, whatever the code looks like.
7. **Lint the build against the contract**: `npx ls-design-studio lint-build --project . --url <preview url>`. It reads the frozen `tokens.css`, then checks the source for colour literals and unresolved navigation, and the running page for token drift, a body role that fell back to the framework's default font, off-origin requests, a page that is blank without scripting, and sideways scroll at each width. Fix what it reports; a passing lint is part of finishing, not a formality.
8. **Capture evidence**: `npx ls-design-studio screenshot` at 360, 768, and 1440 pixels into the evidence folder.
9. **Close with a review pass** through `ls-design-review`, scored against the contract's acceptance criteria.

## The contract is law

- Color, type, spacing, radius, elevation, and motion come from the token custom properties or the framework theme that bridges them. A raw hex value, a magic pixel number, or a one-off font size in a component is a defect, not a shortcut.
- A value the design genuinely needs but the contract lacks is a **contract change**: add the token in `DESIGN.md`, regenerate, and note it. Do not add it locally.
- Component variants and states are the ones the contract lists. An extra variant invented during implementation is drift.
- The accessibility baseline and the acceptance criteria in the contract are the build's own acceptance criteria.
- Self-host fonts unless the brief says otherwise. A generated screen's font service link is a design-phase artifact and does not belong in the shipped build.
- Render visuals locally with markup, CSS, SVG, or a canvas. A generated screen's remote image URLs are placeholders for real assets, never the assets themselves.
- A token-driven approved screen is the highest-fidelity input available, because this build imports the very same `tokens.css` the screen rendered from. Keep its `var(--ls-*)` references intact when porting its structure in; introducing a new color literal here is exactly the drift the contract exists to prevent.

## Implementation rules

These four keep an implementation legible and checkable. `ls-design-studio lint-build` enforces the first three.

- **One component per pattern.** Break the approved screen into independent components rather than one file per page. A reusable pattern — a card, a swatch, a spec row — earns its own file. Every component that takes props declares a named `<Name>Props` type; an inline object literal in the signature says the shape was never designed.
- **Content lives in a data module, not in components.** Copy, lists, specifications, and labels belong in something like `src/data/`, so the words can be reviewed and replaced without touching layout. This is also where the handoff's quarantined values land once you have confirmed each one against the brief's product facts.
- **Every navigation target resolves.** A generated screen is a standalone page whose links are `href="#"` stubs. Each one becomes a real target: an anchor to a section that exists, or a route in the router. A link that goes nowhere is an unfinished page, not a detail.
- **Nothing is done before it compiles and lints.** The production build and `lint-build` both pass, or the work is still in progress.

## Routing

`target_stack.json` names a `routerSkill`. Load that specialist for craft guidance — `ls-design-websites` for a multi-section site, `ls-design-landing-pages` for a single conversion page, `ls-design-mobile` for a mobile surface, `ls-design-3d-web` when the design calls for a spatial representation. This skill governs fidelity to the contract; the specialist governs the craft of the surface.

Read [vite react tailwind](references/vite-react-tailwind.md) for the default target stack: scaffold, theme bridge, dark mode wiring, font self-hosting, and the evidence folder shape.

Read [core principles](../ls-design/references/core-principles.md) when the handoff leaves an implementation decision open. Read [design contract](../ls-design/references/design-contract.md) for how the handoff relates to the live contract. Read [rtl foundations](../ls-design/references/rtl-foundations.md) when the build ships a right-to-left locale. Read [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) to check that the implementation kept the palette's evidence. Read [advanced layout decisions](../ls-design/references/advanced-layout.md) for complex composition inside an approved screen.

For a final acceptance pass, hand the result to `ls-design-review`.
