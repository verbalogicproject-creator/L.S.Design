import { useEffect, useState } from "react";
import type { TokensModelDto } from "../api.ts";
import { strings } from "../strings.ts";

export interface TokenPanelProps {
  tokens: TokensModelDto | null;
  loading: boolean;
  error: string | null;
  regenerating: boolean;
  onSave: (tokens: Record<string, unknown>, queueReapply: boolean) => Promise<void>;
}

export function TokenPanel({ tokens, loading, error, regenerating, onSave }: TokenPanelProps): React.JSX.Element {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [rounded, setRounded] = useState<Record<string, string>>({});
  const [spacing, setSpacing] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [queueReapply, setQueueReapply] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!tokens || dirty) return;
    setColors(tokens.colors);
    setRounded(tokens.rounded);
    setSpacing(tokens.spacing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  function updateColor(key: string, value: string): void {
    setColors((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setJustSaved(false);
  }

  function updateRounded(key: string, value: string): void {
    setRounded((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setJustSaved(false);
  }

  function updateSpacing(key: string, value: string): void {
    setSpacing((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setJustSaved(false);
  }

  async function handleSave(): Promise<void> {
    if (!tokens) return;
    setSaving(true);
    try {
      await onSave({ ...tokens, colors, rounded, spacing }, queueReapply);
      setDirty(false);
      setJustSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ls-panel ls-token-panel" aria-label={strings.tokenPanel.heading}>
      <h2 className="ls-panel__heading">{strings.tokenPanel.heading}</h2>
      {loading ? <p>…</p> : null}
      {error ? <p className="ls-panel__error" role="alert">{error}</p> : null}
      {tokens ? (
        <>
          <fieldset className="ls-token-group">
            <legend>{strings.tokenPanel.colors}</legend>
            {Object.entries(colors).map(([key, value]) => (
              <label key={key} className="ls-field ls-field--row">
                <span>{key}</span>
                <span className="ls-field__color-row">
                  <input
                    type="color"
                    value={toColorInputValue(value)}
                    onChange={(event) => updateColor(key, event.target.value)}
                  />
                  <input type="text" value={value} onChange={(event) => updateColor(key, event.target.value)} />
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="ls-token-group">
            <legend>{strings.tokenPanel.rounded}</legend>
            {Object.entries(rounded).map(([key, value]) => (
              <label key={key} className="ls-field ls-field--row">
                <span>{key}</span>
                <input type="text" value={value} onChange={(event) => updateRounded(key, event.target.value)} />
              </label>
            ))}
          </fieldset>
          <fieldset className="ls-token-group">
            <legend>{strings.tokenPanel.spacing}</legend>
            {Object.entries(spacing).map(([key, value]) => (
              <label key={key} className="ls-field ls-field--row">
                <span>{key}</span>
                <input type="text" value={value} onChange={(event) => updateSpacing(key, event.target.value)} />
              </label>
            ))}
          </fieldset>
          <label className="ls-field ls-field--row">
            <span>{strings.tokenPanel.queueReapply}</span>
            <input
              type="checkbox"
              checked={queueReapply}
              onChange={(event) => setQueueReapply(event.target.checked)}
            />
          </label>
          <div className="ls-decision__row">
            <button
              type="button"
              className="ls-btn ls-btn--primary"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {strings.tokenPanel.save}
            </button>
            {regenerating ? <span className="ls-badge ls-badge--info">{strings.tokenPanel.regenerating}</span> : null}
            {justSaved && !dirty ? <span className="ls-badge">{strings.tokenPanel.saved}</span> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function toColorInputValue(value: string): string {
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : "#000000";
}
