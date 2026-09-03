import { StudioError, type ErrorCode } from "../shared/schema.ts";

/** Thin typed client over the studio's local HTTP API. */
export class StudioClient {
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async get<T>(path: string, timeoutMs = 30_000): Promise<T> {
    return this.send<T>("GET", path, undefined, timeoutMs);
  }

  async post<T>(path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
    return this.send<T>("POST", path, body, timeoutMs);
  }

  async put<T>(path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
    return this.send<T>("PUT", path, body, timeoutMs);
  }

  async patch<T>(path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
    return this.send<T>("PATCH", path, body, timeoutMs);
  }

  private async send<T>(method: string, path: string, body: unknown, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        ...(body === undefined
          ? {}
          : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
      });
    } catch (error) {
      throw new StudioError("E_NO_STUDIO", `cannot reach the studio at ${this.baseUrl}: ${String(error)}`);
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (!response.ok) {
      const envelope = parsed as { error?: { code?: string; message?: string; detail?: Record<string, unknown> } };
      const code = (envelope?.error?.code ?? "E_NO_STUDIO") as ErrorCode;
      throw new StudioError(code, envelope?.error?.message ?? `${method} ${path} failed (${response.status})`,
        envelope?.error?.detail);
    }
    return parsed as T;
  }
}

export async function probeHealth(baseUrl: string, timeoutMs = 1_500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/healthz`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
