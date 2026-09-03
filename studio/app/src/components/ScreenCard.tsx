import { useState } from "react";
import type { Screen } from "../../../shared/schema.ts";
import { ScreenFrame } from "./ScreenFrame.tsx";
import { DecisionBar, type KeyboardAction } from "./DecisionBar.tsx";
import { strings } from "../strings.ts";

export interface ScreenCardProps {
  screen: Screen;
  x: number;
  y: number;
  online: boolean;
  focused: boolean;
  dragging: boolean;
  keyboardAction: KeyboardAction | null;
  tokensHash: string;
  onHeaderPointerDown: (screenId: string, event: React.PointerEvent<HTMLDivElement>) => void;
  onFocusCard: (screenId: string) => void;
}

export function ScreenCard({
  screen,
  x,
  y,
  online,
  focused,
  dragging,
  keyboardAction,
  tokensHash,
  onHeaderPointerDown,
  onFocusCard,
}: ScreenCardProps): React.JSX.Element {
  const [preferLive, setPreferLive] = useState(true);

  return (
    <div
      className={`ls-card${focused ? " ls-card--focused" : ""}`}
      style={{ left: x, top: y, width: screen.width }}
      tabIndex={0}
      onFocus={() => onFocusCard(screen.id)}
      data-screen-id={screen.id}
    >
      <div className="ls-card__header" onPointerDown={(event) => onHeaderPointerDown(screen.id, event)}>
        <div className="ls-card__titles">
          <span className="ls-card__title">{screen.title}</span>
          <span className="ls-card__slug">{screen.slug}</span>
        </div>
        <div className="ls-card__badges">
          <span className="ls-card__badge">{screen.device}</span>
          <span className="ls-card__badge">{strings.screenCard.revisionBadge(screen.revision)}</span>
          {screen.revision > 1 ? (
            <span className="ls-card__badge ls-card__badge--info">
              {strings.screenCard.supersedes(screen.revision)}
            </span>
          ) : null}
          {screen.staleTokens ? (
            <span className="ls-card__badge ls-card__badge--warn">{strings.screenCard.staleTokens}</span>
          ) : null}
          <button
            type="button"
            className="ls-card__toggle"
            onClick={() => setPreferLive((value) => !value)}
            title={preferLive ? strings.screenCard.liveToggleOn : strings.screenCard.liveToggleOff}
          >
            {preferLive ? strings.screenCard.liveToggleOn : strings.screenCard.liveToggleOff}
          </button>
        </div>
      </div>
      <ScreenFrame
        screen={screen}
        online={online}
        preferLive={preferLive}
        dragging={dragging}
        tokensHash={tokensHash}
      />
      <DecisionBar screen={screen} keyboardAction={keyboardAction} />
    </div>
  );
}
