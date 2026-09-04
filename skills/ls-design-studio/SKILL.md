---
name: ls-design-studio
description: Run the local design studio — a browser control room where a person reviews generated screens, approves or rejects them with notes, edits tokens, and releases an approved handoff to the builder. Use when design direction needs human confirmation on real screens before implementation starts.
---

# L.S.Design Studio

Turn design review into a loop with a human in it. The studio is a local web application plus a server that owns `design/design.json`; the coding agent drives generation through the studio's own MCP tools and waits for the person's decisions instead of guessing them.

## Decision order

User and repository requirements come first, followed by product and brand truth, accessibility and function, this specialist's guidance, then aesthetic defaults. A human decision recorded in the studio outranks the agent's own judgment about a screen.

## What the studio is and is not

- It **is** a canvas of generated screens, a token panel with live contrast, a decision bar per screen, a request queue, and a gate that releases `design/handoff/` only when every screen is approved.
- It **is not** a generator. Screens come from a screen-generation service reached over MCP, or from the coding agent authoring HTML directly against `design/tokens.css`. The studio records and reviews; it never calls a generation API and never holds an API key.
- It **is not** a drawing tool. Direct manipulation is limited to curation — arrange, compare, approve, reject, and turn token knobs. Element-level editing is deliberately out of scope.

## Prerequisites

`design/DESIGN.md` must exist. If it does not, run `ls-design-contract` first — the studio has nothing to apply without tokens. Node 20 or newer is required for the studio only; the rest of this suite has no runtime requirement.

## Start it

```bash
npx ls-design-studio --project . --open
```

Register the studio's MCP entry in the target project so the agent can drive it:

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

The MCP entry attaches to a running server through `design/.studio.lock`, and spawns one detached if none is running. The HTTP server is the single writer of `design/design.json` and binds to the loopback address only.

## Orchestration protocol

1. `studio_open_project` — starts or attaches, returns the URL to hand to the person.
2. `studio_status` — read the current revision, screen list, pending requests, and gate state before acting.
3. Generate the first screens. Either call the screen-generation MCP server, or author the HTML directly against `design/tokens.css` when no service is available or the project must stay self-contained.
4. `studio_add_screen` for each result, with both the HTML and a rendered PNG. The PNG is what the canvas paints first, so a screen stays reviewable offline.
5. `studio_wait_for_decision` — long-poll. The person approves, rejects with notes, or edits tokens in the browser; each of those becomes an event and, where it implies work, a queued request.
6. Claim the request, do the work, and post the result with `studio_update_screen`, which creates a new revision and returns the screen to pending. Resolve the request.
7. Repeat until the gate reports it can pass, then `studio_export_handoff`.
8. Hand `design/handoff/` to `ls-design-build`.

Never mark a screen approved on the person's behalf. `studio_set_decision` with `by: "agent"` exists for recording an agent-side rejection — a screen that failed a check the agent ran — not for granting approval.

## The gate

`design/handoff/` is written only when there is at least one screen, every screen is approved, no screen is marked stale against the current tokens, and no token reapplication is still queued. A forced export is stamped as not having passed the gate, and the builder is told to treat it as provisional.

## Token edits

A token change in the browser rewrites the frontmatter of `design/DESIGN.md`, regenerates `tokens.css`, `tailwind.theme.css`, and `preview.html`, marks every baked screen stale, and queues a reapplication request. Token-driven screens are exempt: they read the regenerated `tokens.css` and repaint on their own. Prose in `DESIGN.md` is never touched. Answer that request by reapplying the design system at the generator and re-adding the refreshed baked screens; a stale mark clears when its screen returns, and also clears by itself if the tokens are edited back to the values the screen was captured under.

Read [orchestration protocol](references/orchestration-protocol.md) for the full tool contract, error codes, polling budgets, and the mapping from a rejection note to a concrete generation call.

Read [core principles](../ls-design/references/core-principles.md) when a screen forces a direction decision the contract did not settle. Read [design contract](../ls-design/references/design-contract.md) for the artifact the studio operates on. Read [rtl foundations](../ls-design/references/rtl-foundations.md) before approving screens for a right-to-left locale. Read [natural color and humanization](../ls-design/references/natural-color-and-humanization.md) when judging whether generated screens are specific or generic. Read [advanced layout decisions](../ls-design/references/advanced-layout.md) when a screen's composition needs more than the default grid.

For a final acceptance pass on the built result, hand the work to `ls-design-review`.

Read [interface copy](../ls-design/references/interface-copy.md) when judging whether the words on a generated screen are specific to the product or filler.
