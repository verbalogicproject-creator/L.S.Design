import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import type { Env } from "./context.ts";

const PING_MS = 25_000;

/**
 * Server-sent events. The first message carries the whole document so a client
 * that connects late is never out of date; later messages are deltas and the
 * client refetches state. Deltas stay small on purpose: the document is the
 * source of truth, and the stream only says "something with this seq changed".
 */
export function eventRoutes(): Hono<Env> {
  const app = new Hono<Env>();

  app.get("/events", (context) =>
    streamSSE(context, async (stream) => {
      const service = context.get("service");
      let open = true;

      await stream.writeSSE({
        event: "snapshot",
        data: JSON.stringify(service.state()),
        id: String(service.state().seq),
      });

      const queue: Array<{ seq: number; types: string[] }> = [];
      let notify: (() => void) | null = null;

      const unsubscribe = service.store.subscribe((events) => {
        if (events.length === 0) return;
        const last = events[events.length - 1];
        queue.push({ seq: last?.seq ?? 0, types: events.map((event) => event.type) });
        notify?.();
      });

      stream.onAbort(() => {
        open = false;
        unsubscribe();
        notify?.();
      });

      try {
        while (open) {
          if (queue.length === 0) {
            await Promise.race([
              new Promise<void>((resolve) => {
                notify = resolve;
              }),
              sleep(PING_MS),
            ]);
            notify = null;
          }
          if (!open) break;
          if (queue.length === 0) {
            await stream.writeSSE({ event: "ping", data: String(Date.now()) });
            continue;
          }
          const delta = queue.shift();
          if (!delta) continue;
          await stream.writeSSE({ event: "delta", data: JSON.stringify(delta), id: String(delta.seq) });
        }
      } finally {
        unsubscribe();
      }
    }),
  );

  /**
   * Long poll for the agent side. Returns as soon as anything happens after
   * `cursor`, or empty at the timeout — an empty return is a normal outcome,
   * not an error, and replaying an old cursor yields the same events again.
   */
  app.get("/wait", async (context) => {
    const service = context.get("service");
    const cursor = Number(context.req.query("cursor") ?? 0);
    const timeoutSec = Math.min(300, Math.max(1, Number(context.req.query("timeoutSec") ?? 120)));

    let snapshot = service.eventsSince(Number.isFinite(cursor) ? cursor : 0);
    if (snapshot.events.length === 0) {
      await new Promise<void>((resolveWait) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          unsubscribe();
          clearTimeout(timer);
          resolveWait();
        };
        const unsubscribe = service.store.subscribe(() => finish());
        const timer = setTimeout(finish, timeoutSec * 1000);
        timer.unref?.();
      });
      snapshot = service.eventsSince(Number.isFinite(cursor) ? cursor : 0);
    }

    const state = service.state();
    return context.json({
      cursor: snapshot.cursor,
      events: snapshot.events,
      truncated: snapshot.truncated,
      pendingRequests: state.requests.filter((request) => request.state === "pending"),
      gate: service.gate(),
    });
  });

  return app;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}
