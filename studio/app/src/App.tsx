import { useCallback, useEffect, useRef, useState } from "react";
import type { Screen } from "../../shared/schema.ts";
import { Toolbar, type DecisionFilter, type DeviceFilter } from "./components/Toolbar.tsx";
import { Canvas, type CanvasHandle } from "./components/Canvas.tsx";
import { GateBanner } from "./components/GateBanner.tsx";
import { RequestQueue } from "./components/RequestQueue.tsx";
import { TabBar, type StudioTab } from "./components/TabBar.tsx";
import { ReviewList } from "./components/ReviewList.tsx";
import { TokenPanel } from "./components/TokenPanel.tsx";
import { ContrastTable } from "./components/ContrastTable.tsx";
import type { KeyboardAction } from "./components/DecisionBar.tsx";
import { cancelRequest, getTokens, postHandoff, putTokens, type TokensResponse } from "./api.ts";
import { describeError, studioStore, useStudioStore } from "./state.ts";
import { strings } from "./strings.ts";

export function App(): React.JSX.Element {
  const { designState, status, loading, error, connected } = useStudioStore();
  const canvasRef = useRef<CanvasHandle | null>(null);

  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [focusedScreenId, setFocusedScreenId] = useState<string | null>(null);
  const [keyboardAction, setKeyboardAction] = useState<KeyboardAction | null>(null);
  const [panelHidden, setPanelHidden] = useState(false);
  const [tab, setTab] = useState<StudioTab>("board");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [tokensState, setTokensState] = useState<{
    data: TokensResponse | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });

  useEffect(() => {
    void studioStore.start();
    return () => studioStore.stop();
  }, []);

  const refetchTokens = useCallback(async () => {
    setTokensState((prev) => ({ ...prev, loading: prev.data === null }));
    try {
      const data = await getTokens();
      setTokensState({ data, loading: false, error: null });
    } catch (err) {
      setTokensState((prev) => ({ ...prev, loading: false, error: describeError(err) }));
    }
  }, []);

  useEffect(() => {
    void refetchTokens();
  }, [refetchTokens]);

  useEffect(() => {
    if (status && tokensState.data && status.tokensHash !== tokensState.data.tokensHash) {
      void refetchTokens();
    }
  }, [status, tokensState.data, refetchTokens]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!focusedScreenId) return;
      if (event.key === "a") {
        setKeyboardAction({ screenId: focusedScreenId, action: "approve", nonce: Date.now() });
      } else if (event.key === "r") {
        setKeyboardAction({ screenId: focusedScreenId, action: "reject", nonce: Date.now() });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedScreenId]);

  async function handleCancelRequest(id: string): Promise<void> {
    try {
      await cancelRequest(id);
      await studioStore.refetch();
    } catch {
      // surfaced implicitly: the request stays visible with its prior state
    }
  }

  async function handleSaveTokens(nextTokens: Record<string, unknown>, queueReapply: boolean): Promise<void> {
    await studioStore.withConflictRetry((rev) => putTokens({ tokens: nextTokens, ifRev: rev, queueReapply }));
    await refetchTokens();
    await studioStore.refetch();
  }

  async function handleExport(force = false): Promise<void> {
    setExporting(true);
    setExportError(null);
    try {
      await postHandoff({ force });
      await studioStore.refetch();
    } catch (err) {
      setExportError(describeError(err));
    } finally {
      setExporting(false);
    }
  }

  const screens: Screen[] = designState?.screens ?? [];
  const filteredScreens = screens.filter((screen) => {
    if (deviceFilter !== "all" && screen.device !== deviceFilter) return false;
    if (decisionFilter !== "all" && screen.decision.state !== decisionFilter) return false;
    return true;
  });

  const regenerating = (status?.pendingRequests ?? []).some(
    (request) => request.type === "reapply_design_system" || request.state === "claimed",
  );

  if (loading && !designState) {
    return <div className="ls-loading">{strings.errors.loadFailed}</div>;
  }

  if (error && !designState) {
    return <div className="ls-loading ls-loading--error" role="alert">{error}</div>;
  }

  if (!designState || !status) {
    return <div className="ls-loading">…</div>;
  }

  return (
    <div className={`ls-app${panelHidden ? " ls-app--panel-hidden" : ""}`} data-tab={tab}>
      <Toolbar
        projectName={designState.project.name}
        status={status.status}
        online={status.online}
        connected={connected}
        deviceFilter={deviceFilter}
        decisionFilter={decisionFilter}
        canExport={status.gate.canPass}
        exporting={exporting}
        onDeviceFilterChange={setDeviceFilter}
        onDecisionFilterChange={setDecisionFilter}
        onFitAll={() => canvasRef.current?.fitAll()}
        onZoomActual={() => canvasRef.current?.zoomActual()}
        onResetLayout={() => canvasRef.current?.resetLayout()}
        onExport={() => void handleExport(false)}
        panelHidden={panelHidden}
        onTogglePanel={() => setPanelHidden((value) => !value)}
      />
      <TabBar
        active={tab}
        pendingReviews={screens.filter((screen) => screen.decision.state === "pending").length}
        onChange={setTab}
      />
      <GateBanner
        gate={status.gate}
        exporting={exporting}
        onExport={() => void handleExport(false)}
        onForceExport={() => void handleExport(true)}
      />
      {exportError ? <p className="ls-app__error" role="alert">{exportError}</p> : null}
      <div className="ls-app__body">
        <div className="ls-app__board" id="ls-panel-board" role="tabpanel" aria-labelledby="ls-tab-board">
        <Canvas
          ref={canvasRef}
          screens={filteredScreens}
          online={status.online}
          focusedScreenId={focusedScreenId}
          keyboardAction={keyboardAction}
          tokensHash={status.tokensHash}
          onFocusCard={setFocusedScreenId}
        />
        </div>
        <aside className="ls-app__sidebar">
          <div className="ls-panel-group ls-panel-group--review" id="ls-panel-review" role="tabpanel" aria-labelledby="ls-tab-review">
            <ReviewList
              screens={filteredScreens}
              onShowOnCanvas={(screenId) => {
                setFocusedScreenId(screenId);
                setTab("board");
                canvasRef.current?.centerOn(screenId);
              }}
            />
            <RequestQueue
              requests={status.pendingRequests}
              screens={screens}
              onCancel={(id) => void handleCancelRequest(id)}
            />
          </div>
          <div className="ls-panel-group ls-panel-group--tokens" id="ls-panel-tokens" role="tabpanel" aria-labelledby="ls-tab-tokens">
            <TokenPanel
              tokens={tokensState.data?.tokens ?? null}
              loading={tokensState.loading}
              error={tokensState.error}
              regenerating={regenerating}
              onSave={handleSaveTokens}
            />
            <ContrastTable rows={tokensState.data?.contrast ?? []} />
          </div>
        </aside>
      </div>
    </div>
  );
}
