import { useEffect, useState } from "react";
import type { RequestType, Screen } from "../../../shared/schema.ts";
import { createRequest, postDecision } from "../api.ts";
import { studioStore, describeError } from "../state.ts";
import { strings } from "../strings.ts";

export type FollowUp = "none" | "regenerate" | "edit_with_prompt" | "variants";

export interface KeyboardAction {
  screenId: string;
  action: "approve" | "reject";
  nonce: number;
}

export interface DecisionBarProps {
  screen: Screen;
  keyboardAction: KeyboardAction | null;
}

export function DecisionBar({ screen, keyboardAction }: DecisionBarProps): React.JSX.Element {
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState<FollowUp>("none");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keyboardAction || keyboardAction.screenId !== screen.id) return;
    if (keyboardAction.action === "approve") void approve();
    if (keyboardAction.action === "reject") setRejecting(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardAction]);

  async function approve(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await studioStore.withConflictRetry((rev) =>
        postDecision(screen.id, { state: "approved", ifRev: rev }),
      );
      await studioStore.refetch();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRejection(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await studioStore.withConflictRetry((rev) =>
        postDecision(screen.id, { state: "rejected", notes, ifRev: rev }),
      );
      if (followUp !== "none") {
        const type: RequestType = followUp;
        const payload = followUp === "edit_with_prompt" ? { prompt } : undefined;
        await createRequest({ type, screenId: screen.id, payload });
      }
      await studioStore.refetch();
      setRejecting(false);
      setNotes("");
      setPrompt("");
      setFollowUp("none");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ls-decision">
      {!rejecting ? (
        <div className="ls-decision__row">
          <button type="button" className="ls-btn ls-btn--approve" disabled={submitting} onClick={() => void approve()}>
            {strings.decision.approve}
          </button>
          <button type="button" className="ls-btn ls-btn--reject" disabled={submitting} onClick={() => setRejecting(true)}>
            {strings.decision.reject}
          </button>
        </div>
      ) : (
        <div className="ls-decision__panel">
          <label className="ls-field">
            <span>{strings.decision.notesLabel}</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={strings.decision.notesPlaceholder}
              rows={3}
            />
          </label>
          <label className="ls-field">
            <span>{strings.decision.followUp}</span>
            <select value={followUp} onChange={(event) => setFollowUp(event.target.value as FollowUp)}>
              <option value="none">{strings.decision.followUpNone}</option>
              <option value="regenerate">{strings.decision.followUpRegenerate}</option>
              <option value="edit_with_prompt">{strings.decision.followUpEdit}</option>
              <option value="variants">{strings.decision.followUpVariants}</option>
            </select>
          </label>
          {followUp === "edit_with_prompt" ? (
            <label className="ls-field">
              <span>{strings.decision.promptLabel}</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={strings.decision.promptPlaceholder}
                rows={2}
              />
            </label>
          ) : null}
          <div className="ls-decision__row">
            <button type="button" className="ls-btn ls-btn--reject" disabled={submitting} onClick={() => void submitRejection()}>
              {strings.decision.submit}
            </button>
            <button type="button" className="ls-btn" disabled={submitting} onClick={() => setRejecting(false)}>
              {strings.decision.cancel}
            </button>
          </div>
        </div>
      )}
      {error ? <p className="ls-decision__error" role="alert">{error}</p> : null}
    </div>
  );
}
