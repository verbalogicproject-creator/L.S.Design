import type { DesignState, Device } from "../../../shared/schema.ts";
import { strings } from "../strings.ts";

export type DeviceFilter = Device | "all";
export type DecisionFilter = "all" | "pending" | "approved" | "rejected";

export interface ToolbarProps {
  projectName: string;
  status: DesignState["status"];
  online: boolean;
  connected: boolean;
  deviceFilter: DeviceFilter;
  decisionFilter: DecisionFilter;
  canExport: boolean;
  exporting: boolean;
  onDeviceFilterChange: (value: DeviceFilter) => void;
  onDecisionFilterChange: (value: DecisionFilter) => void;
  onFitAll: () => void;
  onZoomActual: () => void;
  onResetLayout: () => void;
  onExport: () => void;
  panelHidden: boolean;
  onTogglePanel: () => void;
}

export function Toolbar({
  projectName,
  status,
  online,
  connected,
  deviceFilter,
  decisionFilter,
  canExport,
  exporting,
  onDeviceFilterChange,
  onDecisionFilterChange,
  onFitAll,
  onZoomActual,
  onResetLayout,
  onExport,
  panelHidden,
  onTogglePanel,
}: ToolbarProps): React.JSX.Element {
  return (
    <header className="ls-toolbar">
      <div className="ls-toolbar__group">
        <span className="ls-toolbar__project">{projectName}</span>
        <span className="ls-badge ls-badge--status">{strings.status[status]}</span>
        <span className={`ls-badge ${online ? "ls-badge--online" : "ls-badge--offline"}`}>
          {online ? strings.toolbar.online : strings.toolbar.offline}
        </span>
        {!connected ? <span className="ls-badge ls-badge--warn">{strings.toolbar.reconnecting}</span> : null}
      </div>
      <div className="ls-toolbar__group">
        <button type="button" className="ls-btn" onClick={onFitAll}>
          {strings.toolbar.zoomFitAll}
        </button>
        <button type="button" className="ls-btn" onClick={onZoomActual}>
          {strings.toolbar.zoomActual}
        </button>
        <button
          type="button"
          className="ls-btn"
          onClick={onResetLayout}
          title="Return every card to its default place on the board"
        >
          {strings.toolbar.resetLayout}
        </button>
        <button
          type="button"
          className="ls-btn ls-btn--panel-toggle"
          onClick={onTogglePanel}
          aria-pressed={!panelHidden}
        >
          {panelHidden ? strings.toolbar.panelToggleShow : strings.toolbar.panelToggleHide}
        </button>
      </div>
      <div className="ls-toolbar__group">
        <select
          aria-label="device filter"
          value={deviceFilter}
          onChange={(event) => onDeviceFilterChange(event.target.value as DeviceFilter)}
        >
          <option value="all">{strings.toolbar.deviceAll}</option>
          <option value="desktop">{strings.toolbar.deviceDesktop}</option>
          <option value="tablet">{strings.toolbar.deviceTablet}</option>
          <option value="mobile">{strings.toolbar.deviceMobile}</option>
        </select>
        <select
          aria-label="decision filter"
          value={decisionFilter}
          onChange={(event) => onDecisionFilterChange(event.target.value as DecisionFilter)}
        >
          <option value="all">{strings.toolbar.decisionAll}</option>
          <option value="pending">{strings.toolbar.decisionPending}</option>
          <option value="approved">{strings.toolbar.decisionApproved}</option>
          <option value="rejected">{strings.toolbar.decisionRejected}</option>
        </select>
      </div>
      <div className="ls-toolbar__group">
        <button type="button" className="ls-btn ls-btn--primary" disabled={!canExport || exporting} onClick={onExport}>
          {strings.toolbar.exportHandoff}
        </button>
      </div>
    </header>
  );
}
