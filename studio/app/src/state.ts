import { useSyncExternalStore } from "react";
import type { DesignState } from "../../shared/schema.ts";
import {
  ApiError,
  getState,
  getStatus,
  openEventStream,
  type StatusResponse,
} from "./api.ts";
import { strings } from "./strings.ts";

export interface StudioStoreState {
  designState: DesignState | null;
  status: StatusResponse | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

const initialState: StudioStoreState = {
  designState: null,
  status: null,
  loading: true,
  error: null,
  connected: false,
};

/**
 * Small external store: holds the current DesignState and derived status,
 * refetches on SSE deltas, reconnects the stream with backoff, and retries
 * a mutating action exactly once after re-reading state on E_REV_CONFLICT.
 */
class StudioStore {
  private state: StudioStoreState = initialState;
  private readonly listeners = new Set<() => void>();
  private closeStream: (() => void) | undefined;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StudioStoreState => this.state;

  private setState(patch: Partial<StudioStoreState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  async start(): Promise<void> {
    await this.refetch();
    this.closeStream?.();
    this.closeStream = openEventStream(
      (snapshot) => {
        this.setState({ designState: snapshot, loading: false, error: null });
        this.refetchStatus();
      },
      () => {
        void this.refetch();
      },
      (connected) => {
        this.setState({ connected });
      },
    );
  }

  stop(): void {
    this.closeStream?.();
    this.closeStream = undefined;
  }

  async refetch(): Promise<void> {
    this.setState({ loading: this.state.designState === null, error: null });
    try {
      const [designState, status] = await Promise.all([getState(), getStatus()]);
      this.setState({ designState, status, loading: false, error: null });
    } catch (err) {
      this.setState({ loading: false, error: describeError(err) });
    }
  }

  private async refetchStatus(): Promise<void> {
    try {
      const status = await getStatus();
      this.setState({ status });
    } catch {
      // The next full refetch (triggered by a delta) will recover.
    }
  }

  /**
   * Runs a mutating action. If it fails with E_REV_CONFLICT, re-reads the
   * current state, gives the caller a chance to re-derive its arguments
   * against the fresh rev via `resupply`, and retries exactly once. If that
   * retry also fails, the error is re-thrown for the caller to surface.
   */
  async withConflictRetry<T>(
    action: (rev: number | undefined) => Promise<T>,
    resupply?: (state: DesignState) => number | undefined,
  ): Promise<T> {
    const currentRev = this.state.designState?.rev;
    try {
      return await action(currentRev);
    } catch (err) {
      if (err instanceof ApiError && err.code === "E_REV_CONFLICT") {
        await this.refetch();
        const nextRev = resupply
          ? this.state.designState
            ? resupply(this.state.designState)
            : undefined
          : this.state.designState?.rev;
        return await action(nextRev);
      }
      throw err;
    }
  }
}

export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "E_REV_CONFLICT") return strings.errors.revConflict;
    return err.message || strings.errors.generic;
  }
  if (err instanceof Error) return err.message;
  return strings.errors.generic;
}

export const studioStore = new StudioStore();

export function useStudioStore(): StudioStoreState {
  return useSyncExternalStore(studioStore.subscribe, studioStore.getSnapshot, studioStore.getSnapshot);
}
