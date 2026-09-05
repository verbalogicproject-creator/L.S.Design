/**
 * A screen is authored at one depth and stored at another, so the author's
 * relative link to the project's stylesheets cannot be correct in both places.
 *
 * `screen-authoring.md` asks for a relative `<link>` to `design/tokens.css`,
 * which is the right instruction: the whole point of a token-driven screen is
 * that one file backs the studio, the screen, and the build. But the author
 * writes that href before the studio has decided where the file will live. A
 * stored revision sits at `screens/<slug>/r<N>/code.html` and an exported
 * handoff screen at `screens/<slug>/code.html`, so the same href needs three
 * `../` segments in one place and two in the other. No author can satisfy both,
 * and asking them to encode either depth would export an implementation detail
 * that is free for the writer to know and impossible for the author to know.
 *
 * So the writer repairs the href. Every place that writes screen HTML to disk
 * passes the path it is writing to, and the prefix is derived from that path
 * rather than hardcoded, so a change to the storage layout carries the links
 * with it.
 */

/**
 * Files that live at the root of a design directory and are linked directly
 * from a screen. Fonts referenced from inside `fonts.css` resolve against that
 * stylesheet's own URL and need no repair.
 */
const DESIGN_ROOT_STYLESHEETS = new Set(["tokens.css", "tailwind.theme.css", "fonts.css"]);

/*
  The `\s` before `href` is load-bearing: without it this also matches the
  `data-href` of a `<link>` that carries one, and rewrites the wrong attribute.
*/
const LINK_HREF_RE = /(<link\b[^>]*?\shref\s*=\s*)(["'])([^"']*)\2/gi;

/** True when the href addresses something other than a file beside the screen. */
function isAbsoluteReference(href: string): boolean {
  return href.startsWith("/") || href.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/**
 * The path a screen at `screenRelativePath` must use to reach a file at the
 * root of the same directory tree. `screens/a/r1/code.html` yields `../../../`.
 */
export function prefixToRoot(screenRelativePath: string): string {
  const segments = screenRelativePath.split("/").filter((segment) => segment !== "");
  return "../".repeat(Math.max(segments.length - 1, 0));
}

/**
 * Rewrites every relative stylesheet link in a screen so it resolves from
 * `screenRelativePath`, which is where the screen is about to be written.
 * Absolute and remote hrefs are left alone: the linter rejects those
 * separately, and silently rewriting one would hide the violation.
 */
export function relinkDesignStylesheets(html: string, screenRelativePath: string): string {
  const prefix = prefixToRoot(screenRelativePath);
  return html.replace(LINK_HREF_RE, (match, head: string, quote: string, href: string) => {
    if (isAbsoluteReference(href)) return match;
    const withoutFragment = href.split(/[?#]/, 1)[0] ?? "";
    const basename = withoutFragment.split("/").pop() ?? "";
    if (!DESIGN_ROOT_STYLESHEETS.has(basename)) return match;
    return `${head}${quote}${prefix}${basename}${quote}`;
  });
}
