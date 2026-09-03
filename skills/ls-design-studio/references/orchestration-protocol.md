# Orchestration protocol

The full contract between the coding agent and the studio server: the tools, their errors, the polling budgets, and how a human decision becomes a concrete generation call.

## Tools

| Tool | Input | Output |
|---|---|---|
| `studio_open_project` | `project`, optional `port`, `open` | `url`, `port`, `rev`, `status`, `spawned` |
| `studio_status` | none | `rev`, `seq`, `status`, `online`, `tokensHash`, `screens`, `pendingRequests`, `gate` |
| `studio_wait_for_decision` | `cursor`, `timeoutSec` between 1 and 300, default 120 | `cursor`, `events`, `pendingRequests`, `gate`, `truncated` |
| `studio_add_screen` | `title`, `device`, `width`, `height`, `source`, HTML and PNG by path or base64, optional `parentId`, `canvas` | `screenId`, `slug`, `revision`, `rev` |
| `studio_update_screen` | `screenId`, optional `html`, `png`, `title`, `source`, `ifRev` | `screenId`, `revision`, `rev` |
| `studio_set_decision` | `screenId`, `state`, optional `notes`, `by` | `rev`, `gate` |
| `studio_claim_request` | `requestId` | `request` |
| `studio_resolve_request` | `requestId`, `state`, optional `result` | `request` |
| `studio_get_tokens` | none | `tokens`, `tokensHash`, `contrast`, `designMd` |
| `studio_set_tokens` | `tokens`, optional `ifRev`, `queueReapply` | `tokensHash`, `rev`, `requestId` |
| `studio_export_handoff` | optional `force` | `path`, `sha256`, `screens` |
| `studio_screenshot` | `url` or `htmlPath`, `widths`, `outDir`, optional `fullPage` | `files`, `chromium` |

## Errors

Every error carries `code`, `message`, and an optional `detail` object.

| Code | Meaning | Correct response |
|---|---|---|
| `E_NO_STUDIO` | No server owns this project folder | Call `studio_open_project` |
| `E_REV_CONFLICT` | Someone wrote first; `detail.currentRev` is authoritative | Re-read state, rebase the change, retry once |
| `E_SCREEN_NOT_FOUND` | Unknown screen id | Re-read `studio_status` |
| `E_REQUEST_NOT_FOUND` | Unknown or already-resolved request | Re-read pending requests |
| `E_INVALID_FILE` | Payload is not valid HTML or PNG, or exceeds the size limit | Re-render and retry |
| `E_TOKENS_INVALID` | A color, size, or reference failed validation | Report which token and stop |
| `E_GATE_BLOCKED` | Handoff refused; `detail` lists pending, rejected, and stale screens | Resolve those first; do not force |
| `E_PROJECT_LOCKED` | Another server already owns the folder | Attach to it rather than spawning |
| `E_NO_CHROMIUM` | No browser binary found for screenshots | Set the browser path environment variable, or record screenshots as unavailable |

`E_REV_CONFLICT` is normal, not exceptional. The person and the agent write to the same document; one retry after re-reading resolves it. Two consecutive conflicts on the same write mean the person is actively editing — wait for the next decision rather than retrying in a loop.

## The wait loop

`studio_wait_for_decision` is a long poll, not a subscription. Call it with the cursor from the previous response. A timeout returns an empty event list and the same cursor, which is a normal outcome and not an error. Replaying an old cursor returns the same events again, so the loop is safe to resume after an interruption. Events older than the ring buffer's 500-entry window set `truncated`, which means re-read full state with `studio_status` instead of trusting the delta.

Events worth acting on: `screen_rejected`, `tokens_changed`, `request_created`, `gate_passed`. Events worth logging only: `screen_approved`, `canvas_moved`, `screen_added`.

## From a rejection to a generation call

The person rejects a screen with a note. The server copies that note verbatim into a queued request. Map the request type to the work:

| Request type | Work |
|---|---|
| `regenerate` | Regenerate the screen from the original brief plus the rejection note as an added constraint |
| `edit_with_prompt` | Edit the existing screen in place with the note as the instruction; keeps composition, changes what was called out |
| `variants` | Produce alternates of the current screen for the person to choose between |
| `add_screen` | Generate a new screen from the payload's title and description |
| `reapply_design_system` | Re-emit the token document for the generator, apply it, and re-download every screen |

Do not paraphrase a rejection note into a softer instruction. The note is the person's design decision; pass it through.

## Working with an external screen generator

When a screen-generation MCP server is available — Google Stitch is the one this suite was built against — the shape of the work is:

1. Create a project at the generator once, and record its identifier in `design.json` through the `source` field of the first screen.
2. Emit the token document in the generator's expected form with `ls-design-studio tokens --emit stitch`. That variant strips the `dark-` prefixed tokens, which the public design.md format has no place for, so the generator sees a clean document while `DESIGN.md` remains the single source of truth.
3. Upload the token document, create a design system from it, and apply it to the project before generating screens. Applying it afterwards means regenerating everything.
4. Generate a screen from text. Generation is asynchronous and can take minutes.
5. Poll for the result every 10 seconds, giving up after 5 minutes and marking the request failed with the reason. A failed request stays visible in the queue so the person can see what happened rather than watching a screen never appear.
6. Download both the HTML and the screenshot. Request the screenshot at the screen's full width.
7. Add or update the screen in the studio with both files.

When no generator is available, or the project must stay free of external services, author the screen HTML directly against `design/tokens.css` and render the PNG with `ls-design-studio screenshot`. The studio does not care which path produced a screen; the `source` field records which one it was.

## Token-driven versus baked screens

When authoring a screen directly rather than pulling it from a generator, author it token-driven by default: link `design/tokens.css` and use only `var(--ls-*)` for color, type, radius, and spacing — no hex or `rgb()`/`hsl()` literal, no remote font, no CDN. Read [screen authoring](../../ls-design-contract/references/screen-authoring.md) for the full rules. A token-driven screen repaints from a token edit with no agent involved, so it is never marked stale and never queues a `reapply_design_system` request.

A screen imported from an external generator is baked regardless of who requested it, and it stays on the reapply path described above: a token edit marks it stale and queues `reapply_design_system`, which the request-mapping table handles like any other request. Both paths remain valid — pick token-driven when authoring directly, and keep the reapply round-trip for anything sourced from a generator.

## Offline behavior

Generated HTML from an external service usually loads a stylesheet CDN, a font service, and remote images, so it renders as an empty frame without a network. The studio probes connectivity and paints the stored PNG first in every case, swapping in the live frame only when the probe succeeds and the frame loads within 8 seconds. Treat the PNG as the visual record of record for a baked screen: it is what gets copied into the handoff, and it is what the builder reproduces. A token-driven screen has no CDN or remote font to fail, so it renders live regardless of network state; its PNG exists only to give the canvas something to paint before the frame loads, not as a separate record that could diverge from the live HTML.

## Keys and boundaries

The studio server holds no API key and makes no outbound call other than a connectivity probe. Every credentialed call happens in the agent's own process, from the agent's own environment. Keep it that way: a studio that holds keys becomes a credential store reachable from a browser page.
