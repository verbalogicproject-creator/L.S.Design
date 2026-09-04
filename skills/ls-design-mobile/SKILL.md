---
name: ls-design-mobile
description: Design or implement mobile experiences for responsive web, iOS, Android, or cross-platform products. Use when touch ergonomics, compact information architecture, native conventions, or small-screen recomposition are central.
---

# L.S.Design Mobile

Design for the target platform and usage context rather than treating mobile as a smaller desktop.

## Decision order

User and repository requirements come first, followed by product and platform truth, accessibility and function, this specialist's guidance, then aesthetic defaults.

## Mode selection

- For responsive web, preserve document semantics, browser behavior, zoom, reflow, and progressive enhancement.
- For native or cross-platform apps, follow the target platform's navigation, safe-area, typography, input, feedback, and permission conventions.
- When both are required, share product concepts and tokens while allowing platform-specific components and flows.

## Workflow

1. Inspect target platforms, minimum sizes, input modes, navigation model, safe areas, and existing component system.
2. Prioritize tasks and content for intermittent attention and constrained space.
3. Define navigation, screen hierarchy, primary actions, and state transitions before surface styling.
4. Design for realistic content, keyboard presence, text expansion, rotation if supported, and system appearance settings.
5. Test tap, keyboard, screen-reader, loading, offline, permission, empty, and error paths that the product uses.

## Quality bar

- Keep controls comfortably operable and separated; use platform guidance and product testing rather than one universal pixel number.
- Do not hide essential actions behind gestures without visible alternatives.
- Avoid excessive fixed panels, nested scrolling, and viewport-height assumptions.
- Preserve input values and navigation state through interruption and errors.
- Use native controls where they improve familiarity, accessibility, or input behavior.
- Make haptics, animation, and sound supplementary and user-respectful.

Read [references/platform-patterns.md](references/platform-patterns.md) for web/native differences and mobile validation states.

Read [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) when translating a visual direction to compact surfaces. Read [advanced layout decisions](../ls-design/references/advanced-layout.md) for container-aware responsive web components or complex recomposition; native platform layout systems remain authoritative in native applications.

Before building a new interface, check for `design/DESIGN.md` and obey it if present; if it is absent and this is new build work, run `ls-design-contract` first. Read [design contract](../ls-design/references/design-contract.md) for the full consumption rule, [core principles](../ls-design/references/core-principles.md) when the direction is new or two rules conflict, and [rtl foundations](../ls-design/references/rtl-foundations.md) whenever the work ships a right-to-left locale or a locale-portable component. For a final acceptance pass, hand the result to `ls-design-review`.

Read [interface copy](../ls-design/references/interface-copy.md) when writing labels and actions for small screens, where every word competes for space with the content.
