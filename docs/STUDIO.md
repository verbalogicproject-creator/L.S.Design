# The design studio

`ls-design-studio` is a local design control room: a canvas of generated screens, a token panel
with live contrast, a decision bar per screen, a request queue, and a gate that releases an
approved handoff. This is the operator and integrator guide — install, start, drive it from a
coding agent over MCP, and troubleshoot it when something goes wrong.

The narrative introduction lives in
[`skills/ls-design-studio/SKILL.md`](../skills/ls-design-studio/SKILL.md); the full tool contract,
error table, and orchestration loop live in
[`skills/ls-design-studio/references/orchestration-protocol.md`](../skills/ls-design-studio/references/orchestration-protocol.md).
This document restates and expands both against the actual server code, so treat a disagreement
between this file and the running server as a bug in this file.

## What the studio is and is not

It is a canvas, a token panel, a decision bar, a request queue, and a gate. It is not a generator:
screens arrive from a screen-generation service the coding agent reaches over MCP, or from the
agent authoring HTML directly against `design/tokens.css`. The studio server never calls a
generation API and never holds an API key. It is not a drawing tool either — direct manipulation
inside the browser is limited to curation: arrange screens on the canvas, compare them, approve or
reject with notes, and turn token knobs. Element-level editing is deliberately out of scope.

## Install and start

`design/DESIGN.md` must already exist — run `ls-design-contract` first if it does not. Node 20.11
or newer is required for the studio; nothing else in the suite has a runtime requirement.

```bash
cd studio
npm install
npm run build          # builds the browser control room and compiles the server
node dist/server/cli.js --project /path/to/project --open
```

During development, without a build step:

```bash
node server/cli.ts --project /path/to/project --open
```

The server binds to `127.0.0.1` only and prints its URL, the project path, and the current screen
count, then blocks until it is stopped with Ctrl+C.

## Register the MCP entry

Add the studio's MCP entry to the target project so a coding agent can drive it:

```json
{
  "mcpServers": {
    "ls-design-studio": {
      "command": "npx",
      "args": ["-y", "ls-design-studio", "mcp", "--project", "."]
    }
  }
}
```

The MCP entry is a separate stdio process from the HTTP server. It attaches to a server already
running for the project through `design/.studio.lock`, or spawns one detached if none is running.
Every tool call except `studio_screenshot` (which touches no shared state) proxies to the HTTP
server, so the server remains the single writer of `design/design.json` no matter which client —
the browser, the MCP client, or several of each — is acting on the project at once.

## CLI commands

All of these accept `--project <dir>`, defaulting to the current working directory.

| Command | Flags | Does |
|---|---|---|
| `ls-design-studio` (or `serve`) | `--port <n>` (default 4177), `--open` | Starts the HTTP server. Requires `design/DESIGN.md` to already exist. `--open` launches the system browser once the server is listening. |
| `ls-design-studio init` | `--name <n>`, `--description <d>`, `--lang <code>`, `--dir ltr\|rtl`, `--force` | Writes `design/DESIGN.md`, `design/design.json`, `design/tokens.css`, `design/tailwind.theme.css`, and `design/preview.html` from the packaged templates. Existing files are kept unless `--force` is given, so running `init` twice never destroys a written contract. |
| `ls-design-studio mcp` | `--port <n>` | Starts the stdio MCP entry described above. |
| `ls-design-studio tokens` | `--emit css\|tailwind\|stitch` | Prints the current derived file to standard output without writing anything: `css` is `tokens.css`, `tailwind` is `tailwind.theme.css`, `stitch` is the frontmatter with every `dark-` twin stripped, for uploading to an external generator. |
| `ls-design-studio handoff` | `--force` | Runs the same export the `POST /api/handoff` route runs, from the command line. Prints whether the gate passed, the handoff path, screen count, and the manifest's sha256. |
| `ls-design-studio screenshot` | `--url <u>` or `--html <f>` (exactly one), `--widths 360,768,1440`, `--out <dir>`, `--no-full-page` | Renders a URL or local HTML file to PNG at each width with headless Chromium. Used both by the studio to capture a screen and by `ls-design-build` to capture build evidence. |
| `ls-design-studio lint-build` | `--project <dir>`, `--src <dir>`, `--url <u>`, `--widths 360,768,1440`, `--json` | Checks a built implementation against the contract it was built from. Without `--url` it runs the static half only: colour and asset literals in the source, unresolved navigation targets, and components missing a named Props type. With `--url` it also loads the running page and compares every `--ls-*` token against the frozen `tokens.css`, verifies the `body` type role still binds to the contract, and checks for off-origin requests, a page that is blank without scripting, and horizontal overflow at each width. Exits non-zero on any error-level finding. |
| `ls-design-studio doctor` | none | Prints the Node version, project path, whether `design/` and `design/handoff/` are present, the resolved Chromium binary or its absence, network reachability, the lock state, the screen count, and the gate state. A read-only diagnostic; see Troubleshooting below. |

`ls-design-studio --help` prints the same usage summary from the running binary.

## The HTTP API

Every route is namespaced under `/api`, except `/healthz` and the static `/files/*` route, which
serves everything under the project's `design/` folder with path-traversal checks. The built
control room itself is served at `/`.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/healthz` | — | `{ ok: true, rev }` |
| GET | `/api/state` | — | The full `design.json` document |
| GET | `/api/status` | — | `{ rev, seq, status, online, tokensHash, project, screens, pendingRequests, gate }` |
| GET | `/api/wait?cursor=&timeoutSec=` | — | Long-polls up to `timeoutSec` (1–300, default 120) seconds; returns `{ cursor, events, truncated, pendingRequests, gate }` |
| GET | `/api/tokens` | — | `{ tokens, tokensHash, contrast }` — the frontmatter's token groups plus every contrast pair evaluated in both themes |
| PUT | `/api/tokens` | `{ tokens, ifRev?, queueReapply? }` | `{ tokensHash, rev, requestId? }` — rewrites the frontmatter, regenerates the derived files, stales every screen if the hash changed, and queues a `reapply_design_system` request unless `queueReapply` is `false` |
| POST | `/api/screens` | `{ title, device, width, height, source, htmlPath\|htmlBase64, pngPath\|pngBase64, parentId?, canvas? }` | `{ screenId, slug, revision, rev }` |
| POST | `/api/screens/:id/revision` | Same file fields as above, all optional, plus `title?`, `source?`, `ifRev?` | `{ screenId, revision, rev }` — a new revision, returned to pending review |
| POST | `/api/screens/:id/decision` | `{ state: "approved"\|"rejected", notes?, followUp?, ifRev? }` | The full decision result, `{ rev, gate, requestId? }`. Always recorded with `by: "human"`, because this route is what the browser calls. |
| PATCH | `/api/screens/:id/canvas` | `{ x, y }` | `{ rev }` |
| POST | `/api/requests` | `{ type, screenId?, payload? }` | `{ request, rev }` |
| POST | `/api/requests/:id/claim` | `{ claimedBy? }` | `{ request, rev }` |
| POST | `/api/requests/:id/resolve` | `{ state: "done"\|"failed", result? }` | `{ request, rev }` |
| POST | `/api/requests/:id/cancel` | — | `{ request, rev }` |
| GET | `/api/events` | — | Server-sent events: a `snapshot` event carrying the whole document, then `delta` events per change and a `ping` roughly every 25 seconds |
| POST | `/api/handoff` | `{ force? }` | `{ path, sha256, screens, gatePassed }` |

Every error response is a JSON body of the shape `{ error: { code, message, detail? } }`, with the
HTTP status set from the code's entry in the error table below (`E_REV_CONFLICT` and
`E_GATE_BLOCKED` return 409, `E_PROJECT_LOCKED` returns 423, and so on). An error that reaches the
server through a path no declared code covers is reported as `E_INTERNAL` with a 500 status; this
code exists only for that unexpected case and is not one an agent should ever plan a response
around.

## The 12 MCP tools

| Tool | Input | Output |
|---|---|---|
| `studio_open_project` | `project`, `port?`, `open?` | `url`, `port`, `rev`, `status`, `spawned` — starts or attaches, running `init` first if `design/` is missing |
| `studio_status` | none | `rev`, `seq`, `status`, `online`, `tokensHash`, `screens`, `pendingRequests`, `gate` |
| `studio_wait_for_decision` | `cursor`, `timeoutSec` (1–300, default 120) | `cursor`, `events`, `pendingRequests`, `gate`, `truncated` |
| `studio_add_screen` | `title`, `device`, `width`, `height`, `source`, HTML and PNG by path or base64, `parentId?`, `canvas?` | `screenId`, `slug`, `revision`, `rev` |
| `studio_update_screen` | `screenId`, `html?`, `png?`, `title?`, `source?`, `ifRev?` | `screenId`, `revision`, `rev` |
| `studio_set_decision` | `screenId`, `state`, `notes?`, `by?` (default `"agent"`) | `rev`, `gate` |
| `studio_claim_request` | `requestId` | `request` |
| `studio_resolve_request` | `requestId`, `state`, `result?` | `request` |
| `studio_get_tokens` | none | `tokens`, `tokensHash`, `contrast`, `designMd` |
| `studio_set_tokens` | `tokens`, `ifRev?`, `queueReapply?` | `tokensHash`, `rev`, `requestId?` |
| `studio_export_handoff` | `force?` | `path`, `sha256`, `screens` |
| `studio_screenshot` | `url` or `htmlPath`, `widths`, `outDir`, `fullPage?` | `files`, `chromium` |

`studio_open_project` and `studio_screenshot` are the two tools the MCP entry serves without going
through the HTTP server first — `studio_open_project` because it may need to start that server,
and `studio_screenshot` because it touches no project state. Every other tool is a thin proxy to
the matching HTTP route.

## Error codes

| Code | Meaning | Correct agent response |
|---|---|---|
| `E_NO_STUDIO` | No server owns this project folder, or `design/DESIGN.md` / `design/design.json` is missing | Call `studio_open_project`, or run `ls-design-studio init` first if no contract exists at all |
| `E_REV_CONFLICT` | Someone wrote first; `detail.currentRev` is authoritative | Re-read state, rebase the change against the current revision, and retry once. Two consecutive conflicts on the same write mean a person is actively editing — wait for the next decision instead of retrying in a loop |
| `E_SCREEN_NOT_FOUND` | Unknown screen id | Re-read `studio_status` |
| `E_REQUEST_NOT_FOUND` | Unknown, already-resolved, or not-yet-pending request | Re-read pending requests |
| `E_INVALID_FILE` | The HTML or PNG payload is missing, empty, malformed, exceeds its size limit, or (for a screenshot) the target file does not exist | Re-render or re-supply the payload and retry |
| `E_TOKENS_INVALID` | A color, size, typography value, or `{group.key}` reference failed validation, or `DESIGN.md` itself failed to parse | Report which token and stop; do not retry with a guess |
| `E_GATE_BLOCKED` | Handoff refused; `detail` lists the pending, rejected, and stale screen ids and the pending-reapply count | Resolve those first; do not pass `force` unless the user has explicitly asked for a provisional export |
| `E_PROJECT_LOCKED` | Another server process already owns the folder | Attach to it — read `design/.studio.lock` for its port — rather than spawning a second one |
| `E_NO_CHROMIUM` | No Chromium-family binary was found for a screenshot | Set `LS_DESIGN_CHROMIUM` to a binary path, or record that screenshots are unavailable in this environment and continue without them |

`E_REV_CONFLICT` is a normal outcome of two writers sharing one document, not an exceptional
failure — one retry after re-reading resolves it almost always.

## The orchestration loop

1. `studio_open_project` — starts or attaches, returns the URL to hand to the person.
2. `studio_status` — read the current revision, screen list, pending requests, and gate state
   before acting on anything.
3. Generate the first screens, either through an external screen-generation MCP server or by
   authoring HTML directly against `design/tokens.css`.
4. `studio_add_screen` for each result, with both the HTML and a rendered PNG. The PNG is what the
   canvas paints first, so a screen stays reviewable without a network connection.
5. `studio_wait_for_decision` — long-poll with the cursor from the previous call. A timeout returns
   an empty event list and the same cursor; that is a normal outcome, not an error, and the loop
   resumes safely after any interruption because replaying an old cursor returns the same events
   again.
6. When a screen is rejected, the server copies the person's note verbatim into a queued request.
   Claim it with `studio_claim_request`, do the work the request type calls for (see the mapping
   below), post the result with `studio_update_screen` — which creates a new revision and returns
   the screen to pending — and resolve the request with `studio_resolve_request`.
7. Repeat until `studio_status` (or the `gate` field on any response) reports the gate can pass,
   then call `studio_export_handoff`.
8. Hand `design/handoff/` to `ls-design-build`.

Never call `studio_set_decision` with `state: "approved"` on the person's behalf. That tool exists
for an agent-side rejection — a screen that failed a check the agent ran itself — never for
granting approval that only a person can give.

### From a rejection note to a generation call

| Request type | Work |
|---|---|
| `regenerate` | Regenerate the screen from the original brief plus the rejection note as an added constraint |
| `edit_with_prompt` | Edit the existing screen in place with the note as the instruction; keep the composition, change what was called out |
| `variants` | Produce alternates of the current screen for the person to choose between |
| `add_screen` | Generate a new screen from the request payload's title and description |
| `reapply_design_system` | Re-emit the token document for the generator, apply it, and re-download every screen |

Do not paraphrase a rejection note into a softer instruction. The note is the person's design
decision, and it is passed through exactly as written.

## SSE versus long-poll

The studio offers two different ways to observe the same event stream, and they serve different
callers on purpose:

- **`GET /api/events`** (server-sent events) is what the browser control room uses. The first
  message is a `snapshot` carrying the entire `design.json` document, so a client that connects
  late is never out of date. Every later message is a small `delta` naming the sequence number and
  event types that changed — the document itself is the source of truth, and the client refetches
  state rather than trusting the delta to be a complete description. A `ping` is sent roughly every
  25 seconds so an idle connection is not mistaken for a dead one.
- **`GET /api/wait`** (and the `studio_wait_for_decision` MCP tool that wraps it) is a long poll,
  not a subscription, built for an agent that is not maintaining an open connection between calls.
  It blocks the HTTP request itself until something happens after `cursor` or the timeout elapses,
  then returns. There is nothing to reconnect and nothing to miss: the agent simply calls it again
  with the cursor from the previous response.

Use SSE when a client can hold a connection and wants every change as it happens. Use long-poll
when a client — an agent between MCP calls — cannot, and would rather block once per turn.

## What a person experiences

- **The canvas** is a pan-and-zoom surface of generated screens, arranged by device row by
  default, with toolbar controls to fit everything in view or zoom to actual size, and filters by
  device and by decision state.
- **The token panel** shows the current color, radius, and spacing values with a save action; a
  checkbox controls whether saving also queues a reapplication request, since a token edit stales
  every existing screen against the new hash.
  **Live contrast** is a table, one row per declared pair per theme, each showing its computed
  ratio and a pass/fail tag against 4.5:1 for text or 3:1 for an interface component.
- **The decision bar** sits under each screen: an approve button, and a reject flow that opens a
  notes field, an optional follow-up type (regenerate, edit with a prompt, or produce variants),
  and — for the prompt follow-up — a second field for the instruction itself. Approve and reject
  both retry once automatically on a revision conflict before surfacing an error.
- **The request queue** lists every request with its type, target screen title, age, and state,
  with a cancel action available while a request is still pending.
- **The gate banner** shows whether the gate is ready or blocked, and when blocked, lists exactly
  which of the four conditions below are unmet. A force-export action exists behind a
  confirmation dialog, for the case where a person explicitly wants a provisional handoff anyway.

## PNG-first rendering and the offline probe

Generated screen HTML usually needs a stylesheet CDN, a font service, and remote images to render
correctly, so it renders as an empty frame without a network connection. The studio probes
`https://cdn.tailwindcss.com/` on a 60-second cache with a 2.5-second timeout and paints the
screen's stored PNG first in every case, swapping in the live HTML frame only when the probe
succeeds and the frame finishes loading within its own timeout. The PNG is the visual record of
record: it is what a person actually reviews when connectivity is uncertain, and it is the file
that survives into the handoff, not the HTML.

## The gate

The gate can pass only when all four of these hold at once:

1. There is at least one screen.
2. Every screen's decision state is `approved` — none are still `pending` and none are `rejected`.
3. No screen is marked stale against the current token hash.
4. No `reapply_design_system` request is still `pending` or `claimed`.

A forced export (`--force` on the CLI, `force: true` on the HTTP route or the
`studio_export_handoff` tool) writes the handoff even when the gate is blocked, and the resulting
`BRIEF.md` is stamped on its first line as not having passed the gate, so the builder treats it as
provisional rather than approved.

## Troubleshooting

- **`E_NO_STUDIO`.** Either no server currently owns the project folder, or `design/DESIGN.md` (or
  `design/design.json`) does not exist yet. Run `ls-design-studio init --project <dir>` if the
  contract is genuinely missing; otherwise call `studio_open_project` or start the server
  directly.
- **`E_REV_CONFLICT`.** Expected under concurrent editing. Re-read `studio_status` for
  `detail.currentRev`, rebase the intended change onto it, and retry the write once. If it
  conflicts again immediately, stop retrying and wait for `studio_wait_for_decision` instead —
  someone is actively editing the same document.
- **`E_PROJECT_LOCKED`.** Another studio process already holds `design/.studio.lock` for this
  project. Read the lock file for its `port` and attach to that server rather than starting a
  second one; a project folder has exactly one legitimate writer at a time.
- **`E_NO_CHROMIUM`.** No Chromium-family binary was found through `LS_DESIGN_CHROMIUM`, the
  fixed cached install path, or the short list of common system installs — the resolver never
  scans the filesystem beyond those. Set `LS_DESIGN_CHROMIUM` to a valid binary path, or accept
  that screenshots are unavailable in the current environment and continue without them.
- **A stale lock file.** `design/.studio.lock` records the owning process's pid, port, and start
  time. A lock whose pid is no longer alive is treated as free automatically the next time
  anything reads it — `acquireLock` and `attachOrSpawn` both check liveness before treating a lock
  as held — so a crashed server does not need manual cleanup. `ls-design-studio doctor` reports
  whether the current lock, if any, is actually held.
- **A port already in use.** The default port is 4177. Pass `--port <n>` to `serve` or `mcp` to
  use a different one; a project that already has a lock file records the port its running server
  is actually using, so attach to that port instead of guessing.

## Keys and boundaries

The studio server holds no API key and makes no outbound network call other than the connectivity
probe described above. Every credentialed call an agent needs to make — to a screen-generation
service, for instance — happens in the agent's own process, from the agent's own environment, and
is never proxied through the studio. Generated screen HTML is treated as untrusted: it is served
rather than inlined so it has a real origin, rendered inside a sandboxed iframe with no
same-origin access, under a content security policy that permits only the specific external
origins a generator's own output needs.
