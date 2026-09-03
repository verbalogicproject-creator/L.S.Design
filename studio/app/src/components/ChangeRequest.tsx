import { useState } from "react";
import type { Screen } from "../../../shared/schema.ts";
import { createRequest } from "../api.ts";
import { describeError, studioStore } from "../state.ts";
import { strings } from "../strings.ts";

export interface ChangeRequestProps {
  screen: Screen;
}

/**
 * Asking for a change is not the same as rejecting a screen. Rejection is a
 * verdict that blocks the gate; this is "keep going, but different", so it
 * queues the work without touching the decision.
 */
export function ChangeRequest({ screen }: ChangeRequestProps): React.JSX.Element {
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const text = prompt.trim();
    if (text.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await createRequest({ type: "edit_with_prompt", screenId: screen.id, payload: { prompt: text } });
      await studioStore.refetch();
      setPrompt("");
      setSent(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ls-change">
      <label className="ls-field">
        <span className="ls-change__label">{strings.review.changeLabel}</span>
        <textarea
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setSent(false);
          }}
          placeholder={strings.review.changePlaceholder}
          rows={3}
        />
      </label>
      <button
        type="button"
        className="ls-btn"
        disabled={submitting || prompt.trim().length === 0}
        onClick={() => void submit()}
      >
        {strings.review.changeSubmit}
      </button>
      {sent ? <p className="ls-change__sent">{strings.review.changeSent}</p> : null}
      {error ? <p className="ls-change__error" role="alert">{error}</p> : null}
    </div>
  );
}
