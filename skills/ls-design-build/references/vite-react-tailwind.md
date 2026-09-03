# Vite, React, and Tailwind v4 target stack

The default target stack for a handoff whose `target_stack.json` reads `{"framework": "vite-react", "styling": "tailwind-v4", "typescript": true, "tokensVia": "css-vars"}`. Adapt the shape, not the principles, for any other stack.

## Scaffold

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install tailwindcss @tailwindcss/vite
```

Add the plugin in `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

## Wire the contract in

Copy the frozen token files out of the handoff into the app's source, keeping their names:

```bash
cp design/handoff/tokens.css design/handoff/tailwind.theme.css src/styles/
```

`src/styles/tailwind.theme.css` is the only stylesheet the app imports, and it looks like this:

```css
@import "tailwindcss";
@import "./tokens.css";

@theme inline {
  --color-background: var(--ls-color-background);
  --color-surface: var(--ls-color-surface);
  --color-content: var(--ls-color-content);
  --color-primary: var(--ls-color-primary);
  --color-on-primary: var(--ls-color-on-primary);

  --font-display: var(--ls-font-display);
  --font-body: var(--ls-font-body);

  --radius-sm: var(--ls-radius-sm);
  --radius-md: var(--ls-radius-md);
  --radius-lg: var(--ls-radius-lg);

  --spacing-sm: var(--ls-space-sm);
  --spacing-md: var(--ls-space-md);
  --spacing-lg: var(--ls-space-lg);
}
```

`@theme inline` is what makes `bg-surface`, `text-content`, `font-display`, and `rounded-lg` resolve to the contract's custom properties rather than to Tailwind's defaults. The `--ls-` prefix on the source tokens is deliberate: it keeps the contract's namespace clear of the framework's own `--color-*` namespace, so a framework upgrade cannot silently capture a design token.

When the screen you are implementing was approved token-driven, its markup already calls the Tailwind utilities or raw `var(--ls-*)` references this bridge exposes. Port that structure and keep those references as they are; resolving one to a literal color or size while it moves into a component is the drift `@theme inline` exists to prevent.

Import it once, in `src/main.tsx`:

```ts
import "./styles/tailwind.theme.css";
```

## Dark mode

The token file already defines the dark values twice: under the system preference, and under an explicit `[data-theme="dark"]` attribute on the root element. Give the app a toggle that sets or removes that attribute, and let the system preference stand when no attribute is set.

```ts
function setTheme(theme: "light" | "dark" | "auto") {
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
```

Nothing else in the app reads the theme. Every component consumes the semantic tokens, which change underneath it.

## Fonts

Self-host. Download the exact weights and styles the contract names, put the files in `public/fonts/`, and declare them:

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-variable.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-display: swap;
}
```

Then confirm the fallback: disable the font files and check that the layout still holds. A design that collapses without its web font is not finished.

## Component conventions

- One component per contract component, named as the contract names it.
- Variants and sizes come from the contract's list and are typed as a union, so an invented variant fails to compile.
- Every interactive component implements the states the contract lists, including loading and error, and keeps a visible focus style.
- Use logical Tailwind utilities — `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*` — rather than their physical equivalents, so the components stay locale-portable.
- Client-side behavior is added where the contract says a component needs it, and nowhere else.

## Evidence folder

Record the build's own acceptance evidence next to the project, not inside it:

```text
.evidence/<version>/
  browser-results.json      widths checked, console errors, overflow findings
  screenshots/<width>/*.png
  build.log
  review.md
```

`browser-results.json` names the widths checked, any console error, and any horizontal overflow found. Produce the screenshots with:

```bash
npx ls-design-studio screenshot --url http://localhost:4173 --widths 360,768,1440 --out .evidence/<version>/screenshots
```

Run it against the production preview, not the dev server, so what is captured is what ships.

## Definition of done

The production build passes with no errors. Every approved screen has a corresponding implemented surface. No fixture value survives. No raw color, size, or radius literal appears outside the token files. Screenshots exist at all three widths. The review pass records a score against each of the contract's acceptance criteria.

## Checking the build against the contract

```bash
npm run build
npx vite preview --port 4180 &
npx ls-design-studio lint-build --project . --url http://localhost:4180/
```

The static half runs without a URL and needs no browser; the live half needs the page served, because token drift and a blank-without-scripting page are only observable once a browser has resolved the cascade.

Two failures are worth recognising on sight:

- **`body type role — drifted from the contract`.** The framework's own base layer set a default font stack and won, so the page renders in something other than the contract's body role. Bind `font-family`, `font-size`, `font-weight`, and `line-height` on `body` from the role's custom properties.
- **`readable without scripting — N characters`** where N is near zero. A client-rendered application serves an empty root element, so the page is blank to anyone without JavaScript and to most crawlers. Prerender the markup at build time and hydrate it, or serve the page statically.

## Suggested layout

```text
src/
  main.tsx            entry; hydrates the prerendered markup
  App.tsx             composes the sections
  styles.css          imports fonts.css and tailwind.theme.css, defines the type roles
  tokens.css          copied from the handoff, never edited by hand
  tailwind.theme.css  copied from the handoff
  components/         one file per pattern, each with a named Props type
  data/               copy, lists, and confirmed values
public/fonts/         the handoff's vendored faces
evidence/             screenshots at 360, 768, 1440 and browser-results.json
```
