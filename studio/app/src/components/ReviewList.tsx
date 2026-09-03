import type { Screen } from "../../../shared/schema.ts";
import { DecisionBar } from "./DecisionBar.tsx";
import { ChangeRequest } from "./ChangeRequest.tsx";
import { strings } from "../strings.ts";

export interface ReviewListProps {
  screens: Screen[];
  onShowOnCanvas: (screenId: string) => void;
}

/**
 * The decision controls also live in the panel, not only at the foot of a card.
 * A 1440x3754 screen framed to fit a phone puts its decision bar a few pixels
 * tall, so the board is for looking and the panel is for deciding.
 */
export function ReviewList({ screens, onShowOnCanvas }: ReviewListProps): React.JSX.Element {
  return (
    <section className="ls-review">
      <h2 className="ls-panel__heading">{strings.review.heading}</h2>
      {screens.length === 0 ? (
        <p className="ls-panel__empty">{strings.review.empty}</p>
      ) : (
        <ul className="ls-review__list">
          {screens.map((screen) => (
            <li key={screen.id} className="ls-review__item">
              <div className="ls-review__head">
                <img
                  className="ls-review__thumb"
                  src={`/files/${screen.files.png}`}
                  alt=""
                  loading="lazy"
                  width={screen.width}
                  height={screen.height}
                />
                <div className="ls-review__meta">
                  <span className="ls-review__title">{screen.title}</span>
                  <span className="ls-review__slug">{screen.slug}</span>
                  <span className="ls-review__badges">
                    <span className={`ls-badge ls-badge--${screen.decision.state}`}>
                      {strings.review.states[screen.decision.state]}
                    </span>
                    <span className="ls-badge">{strings.screenCard.revisionBadge(screen.revision)}</span>
                  </span>
                </div>
              </div>
              <div className="ls-review__actions">
                <button type="button" className="ls-btn" onClick={() => onShowOnCanvas(screen.id)}>
                  {strings.review.showOnCanvas}
                </button>
                <a
                  className="ls-btn"
                  href={`/files/${screen.files.png}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {strings.review.openFull}
                </a>
              </div>
              {screen.decision.notes ? (
                <p className="ls-review__notes">
                  <span className="ls-review__notes-label">{strings.review.notesLabel}</span>
                  {screen.decision.notes}
                </p>
              ) : null}
              {/*
                The a/r shortcuts stay bound to the focused card so a keypress
                cannot post the same decision twice from two decision bars.
              */}
              <DecisionBar screen={screen} keyboardAction={null} />
              <ChangeRequest screen={screen} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
