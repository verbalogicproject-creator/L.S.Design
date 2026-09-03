import type { Gate } from "../../../shared/schema.ts";
import { strings } from "../strings.ts";

export interface GateBannerProps {
  gate: Gate;
  exporting: boolean;
  onExport: () => void;
  onForceExport: () => void;
}

export function GateBanner({ gate, exporting, onExport, onForceExport }: GateBannerProps): React.JSX.Element {
  const reasons: string[] = [];
  if (gate.pending.length) reasons.push(strings.gateBanner.pending(gate.pending.length));
  if (gate.rejected.length) reasons.push(strings.gateBanner.rejected(gate.rejected.length));
  if (gate.stale.length) reasons.push(strings.gateBanner.stale(gate.stale.length));
  if (gate.pendingReapply) reasons.push(strings.gateBanner.reapply(gate.pendingReapply));

  function handleForceExport(): void {
    if (window.confirm(strings.gateBanner.forceExportConfirm)) onForceExport();
  }

  return (
    <div className={`ls-gate-banner${gate.canPass ? " ls-gate-banner--ok" : " ls-gate-banner--blocked"}`} role="status">
      <span className="ls-gate-banner__label">
        {gate.canPass ? strings.gateBanner.ready : strings.gateBanner.blocked}
      </span>
      {reasons.length ? <span className="ls-gate-banner__reasons">{reasons.join(" · ")}</span> : null}
      <span className="ls-gate-banner__actions">
        <button type="button" className="ls-btn ls-btn--primary" disabled={!gate.canPass || exporting} onClick={onExport}>
          {strings.toolbar.exportHandoff}
        </button>
        <button type="button" className="ls-btn" disabled={exporting} onClick={handleForceExport}>
          {strings.gateBanner.forceExport}
        </button>
      </span>
    </div>
  );
}
