import type { DesignState, Gate, Screen, StudioRequest, RequestType, ErrorCode } from "../../shared/schema.ts";
import type { ContrastResult } from "../../shared/contrast.ts";

export class ApiError extends Error {
  readonly code: ErrorCode | "E_UNKNOWN";
  readonly detail: Record<string, unknown> | undefined;
  readonly status: number;

  constructor(code: ErrorCode | "E_UNKNOWN", message: string, status: number, detail?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export interface StatusResponse {
  rev: number;
  seq: number;
  status: DesignState["status"];
  online: boolean;
  tokensHash: string;
  screens: Screen[];
  pendingRequests: StudioRequest[];
  gate: Gate;
}

export interface TokensModelDto {
  name: string;
  description?: string;
  colors: Record<string, string>;
  typography: Record<string, Record<string, unknown>>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  components: Record<string, Record<string, string>>;
}

export interface TokensResponse {
  tokens: TokensModelDto;
  tokensHash: string;
  contrast: ContrastResult[];
}

export interface DecisionBody {
  state: "approved" | "rejected";
  notes?: string;
  ifRev?: number;
}

export interface DecisionResponse {
  rev: number;
  gate: Gate;
  requestId?: string;
}

export interface CanvasBody {
  x: number;
  y: number;
}

export interface CanvasResponse {
  rev: number;
}

export interface CreateRequestBody {
  type: RequestType;
  screenId?: string;
  payload?: Record<string, unknown>;
}

export interface CreateRequestResponse {
  request: StudioRequest;
  rev: number;
}

export interface CancelRequestResponse {
  request: StudioRequest;
  rev: number;
}

export interface PutTokensBody {
  tokens: Record<string, unknown>;
  ifRev?: number;
  queueReapply?: boolean;
}

export interface PutTokensResponse {
  tokensHash: string;
  rev: number;
  requestId?: string;
}

export interface HandoffBody {
  force?: boolean;
}

export interface HandoffResponse {
  path: string;
  sha256: string;
  screens: number;
  gatePassed: boolean;
}

interface ErrorEnvelope {
  error: { code: ErrorCode | string; message: string; detail?: Record<string, unknown> };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let envelope: ErrorEnvelope | undefined;
    try {
      envelope = (await response.json()) as ErrorEnvelope;
    } catch {
      envelope = undefined;
    }
    if (envelope?.error) {
      throw new ApiError(
        envelope.error.code as ErrorCode,
        envelope.error.message,
        response.status,
        envelope.error.detail,
      );
    }
    throw new ApiError("E_UNKNOWN", `request failed with status ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getState(): Promise<DesignState> {
  return request<DesignState>("/api/state");
}

export function getStatus(): Promise<StatusResponse> {
  return request<StatusResponse>("/api/status");
}

export function postDecision(screenId: string, body: DecisionBody): Promise<DecisionResponse> {
  return request<DecisionResponse>(`/api/screens/${screenId}/decision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchCanvas(screenId: string, body: CanvasBody): Promise<CanvasResponse> {
  return request<CanvasResponse>(`/api/screens/${screenId}/canvas`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createRequest(body: CreateRequestBody): Promise<CreateRequestResponse> {
  return request<CreateRequestResponse>("/api/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cancelRequest(id: string): Promise<CancelRequestResponse> {
  return request<CancelRequestResponse>(`/api/requests/${id}/cancel`, { method: "POST" });
}

export function getTokens(): Promise<TokensResponse> {
  return request<TokensResponse>("/api/tokens");
}

export function putTokens(body: PutTokensBody): Promise<PutTokensResponse> {
  return request<PutTokensResponse>("/api/tokens", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function postHandoff(body: HandoffBody): Promise<HandoffResponse> {
  return request<HandoffResponse>("/api/handoff", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface DeltaEvent {
  seq: number;
  types: string[];
}

/**
 * Opens the SSE stream. Calls `onSnapshot` with the full state on the first
 * message and `onDelta` on every subsequent delta. Reconnects with backoff
 * (1s, 2s, 4s, capped at 10s) whenever the connection closes, and returns a
 * cleanup function that stops all reconnect attempts.
 */
export function openEventStream(
  onSnapshot: (state: DesignState) => void,
  onDelta: (delta: DeltaEvent) => void,
  onConnectionChange?: (connected: boolean) => void,
): () => void {
  let source: EventSource | undefined;
  let stopped = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleReconnect(): void {
    if (stopped) return;
    onConnectionChange?.(false);
    const delay = Math.min(1000 * 2 ** attempt, 10000);
    attempt += 1;
    retryTimer = setTimeout(connect, delay);
  }

  function connect(): void {
    if (stopped) return;
    source = new EventSource("/api/events");

    source.addEventListener("snapshot", (event) => {
      attempt = 0;
      onConnectionChange?.(true);
      try {
        const data = JSON.parse((event as MessageEvent).data) as DesignState;
        onSnapshot(data);
      } catch {
        // ignore malformed snapshot payloads
      }
    });

    source.addEventListener("delta", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as DeltaEvent;
        onDelta(data);
      } catch {
        // ignore malformed delta payloads
      }
    });

    source.onerror = () => {
      source?.close();
      source = undefined;
      scheduleReconnect();
    };
  }

  connect();

  return () => {
    stopped = true;
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    source?.close();
  };
}
