import { strings } from "../strings.ts";

export type StudioTab = "board" | "review" | "tokens";

export interface TabBarProps {
  readonly active: StudioTab;
  readonly pendingReviews: number;
  readonly onChange: (tab: StudioTab) => void;
}

const ORDER: readonly StudioTab[] = ["board", "review", "tokens"];

/**
 * Only shown on a narrow viewport. Stacking the board above the panel left the
 * panel a few centimetres tall at the bottom of the page, half of it under the
 * browser's own chrome; a tab gives each surface the whole screen instead.
 */
export function TabBar({ active, pendingReviews, onChange }: TabBarProps): React.JSX.Element {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const index = ORDER.indexOf(active);
    const next = ORDER[(index + delta + ORDER.length) % ORDER.length];
    if (next) onChange(next);
  }

  return (
    <div className="ls-tabs" role="tablist" aria-label={strings.tabs.label} onKeyDown={handleKeyDown}>
      {ORDER.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`ls-tab-${tab}`}
          aria-selected={active === tab}
          aria-controls={`ls-panel-${tab}`}
          tabIndex={active === tab ? 0 : -1}
          className={`ls-tabs__tab${active === tab ? " ls-tabs__tab--active" : ""}`}
          onClick={() => onChange(tab)}
        >
          {strings.tabs[tab]}
          {tab === "review" && pendingReviews > 0 ? (
            <span className="ls-tabs__count" aria-label={`${pendingReviews} pending`}>
              {pendingReviews}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
