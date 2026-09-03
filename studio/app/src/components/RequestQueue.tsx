import type { Screen, StudioRequest } from "../../../shared/schema.ts";
import { strings } from "../strings.ts";

export interface RequestQueueProps {
  requests: StudioRequest[];
  screens: Screen[];
  onCancel: (id: string) => void;
}

export function RequestQueue({ requests, screens, onCancel }: RequestQueueProps): React.JSX.Element {
  const screenTitle = (screenId: string | undefined): string => {
    if (!screenId) return "—";
    return screens.find((screen) => screen.id === screenId)?.title ?? screenId;
  };

  return (
    <section className="ls-panel ls-request-queue" aria-label={strings.requestQueue.heading}>
      <h2 className="ls-panel__heading">{strings.requestQueue.heading}</h2>
      {requests.length === 0 ? (
        <p className="ls-panel__empty">{strings.requestQueue.empty}</p>
      ) : (
        <table className="ls-table">
          <thead>
            <tr>
              <th>{strings.requestQueue.type}</th>
              <th>{strings.requestQueue.target}</th>
              <th>{strings.requestQueue.age}</th>
              <th>{strings.requestQueue.state}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className={`ls-table__row ls-table__row--${request.state}`}>
                <td>{request.type}</td>
                <td>{screenTitle(request.screenId)}</td>
                <td>{ageLabel(request.createdAt)}</td>
                <td>{strings.requestQueue.states[request.state]}</td>
                <td>
                  {request.state === "pending" ? (
                    <button type="button" className="ls-btn ls-btn--small" onClick={() => onCancel(request.id)}>
                      {strings.requestQueue.cancel}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ageLabel(createdAt: string): string {
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return "—";
  const deltaSec = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m`;
  const deltaHour = Math.floor(deltaMin / 60);
  if (deltaHour < 24) return `${deltaHour}h`;
  return `${Math.floor(deltaHour / 24)}d`;
}
