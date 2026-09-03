# ls-design-studio

Local design control room for L.S.Design: review generated screens, approve them, edit tokens with
live contrast, and release an approved handoff to the builder. It runs entirely on your own
machine — the server binds to the loopback address only and holds no API keys.

## Install

```bash
npm install ls-design-studio
```

Node 20.11 or newer is required. Running it without installing first also works, through `npx`.

## Quick start

`design/DESIGN.md` must already exist in the target project — run the `ls-design-contract` skill,
or `ls-design-studio init`, before starting the server.

```bash
npx ls-design-studio init --project /path/to/project --name "Product"
npx ls-design-studio --project /path/to/project --open
```

The second command starts the HTTP server, prints its URL, and opens it in the system browser.
Press Ctrl+C to stop it.

## CLI

All commands accept `--project <dir>`, defaulting to the current working directory.

| Command | Flags | Does |
|---|---|---|
| `ls-design-studio` (`serve`) | `--port <n>` (default 4177), `--open` | Starts the HTTP server; requires `design/DESIGN.md` |
| `ls-design-studio init` | `--name`, `--description`, `--lang`, `--dir ltr\|rtl`, `--force` | Writes `design/` from the packaged templates; existing files are kept unless `--force` is set |
| `ls-design-studio mcp` | `--port <n>` | Starts the stdio MCP entry a coding agent registers |
| `ls-design-studio tokens` | `--emit css\|tailwind\|stitch` | Prints a derived file to standard output without writing it |
| `ls-design-studio handoff` | `--force` | Exports `design/handoff/` from the command line |
| `ls-design-studio screenshot` | `--url` or `--html`, `--widths`, `--out`, `--no-full-page` | Renders a page to PNG at each width with headless Chromium |
| `ls-design-studio lint-build` | `--project`, `--src`, `--url`, `--widths`, `--json` | Checks a built implementation against its contract: literals and navigation in the source, then token drift, body-role drift, off-origin requests, blank-without-scripting, and overflow on the running page |
| `ls-design-studio doctor` | none | Reports Node version, `design/` and `handoff/` presence, Chromium resolution, network reachability, lock state, screen count, and gate state |

The full HTTP API, MCP tool list, error codes, and orchestration loop are documented in
[`../docs/STUDIO.md`](../docs/STUDIO.md).

## Register the MCP entry

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

The MCP entry is a stdio process separate from the HTTP server. It attaches to a server already
running for the project through `design/.studio.lock`, or spawns one detached if none is running.
Every tool call proxies to the HTTP server except `studio_screenshot`, which touches no shared
project state and runs locally.

## Package layout

```text
studio/
  server/          the Hono HTTP server, the MCP stdio entry, the CLI, and the handoff exporter
  shared/          the zod schema, token model, contrast math, ids, hashing, and path helpers
                   shared between the server and the browser app
  app/             the browser control room: canvas, token panel, decision bar, request queue,
                   gate banner
  templates/       the packaged DESIGN.md, tokens.css, preview.html, and design.json templates
                   `init` writes from — byte-identical to the copies under
                   `skills/ls-design-contract/assets/`
  schema/          design.schema.json, generated from the zod schema in shared/schema.ts
  scripts/         emit-schema.ts, which writes or checks schema/design.schema.json
  tests/           vitest suites covering the store, contrast math, tokens, the HTTP API, the MCP
                   entry, the handoff exporter, and the screenshot renderer
  dist/            build output — the compiled server and the built browser app
```

## Developing it

```bash
npm install
npm run dev          # runs the server directly from source (tsx server/cli.ts)
# tsx, rather than plain node: Node strips TypeScript types only from 22.6,
# and this package supports Node 20.11 and up.
npm run dev:app       # runs the browser app under Vite, against a server started separately
npm run typecheck     # tsc --noEmit
npm test              # vitest run
npm run build         # builds the app, then compiles the server into dist/
npm run schema        # regenerates schema/design.schema.json from the zod source of truth
npm run schema -- --check   # verifies schema/design.schema.json is still current, without writing it
```

## Security boundary, in brief

The studio holds no API keys and makes no outbound network call other than a connectivity probe
used to decide whether a screen can render live or must fall back to its stored PNG. It binds to
`127.0.0.1` only. Generated screen HTML is treated as untrusted: it is served rather than inlined,
rendered in a sandboxed iframe with no same-origin access, under a content security policy scoped
to the specific external origins a generator's output needs. The HTTP server is the single writer
of `design/design.json`, with a lock file recording which process owns a given project folder.
See [`../SECURITY.md`](../SECURITY.md) for the full threat boundary.

## Licence

Apache-2.0. See [`../LICENSE`](../LICENSE).
