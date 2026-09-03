import { useEffect, useRef, useState } from "react";
import type { Screen } from "../../../shared/schema.ts";
import { strings } from "../strings.ts";

const LIVE_TIMEOUT_MS = 8000;

export interface ScreenFrameProps {
  screen: Screen;
  online: boolean;
  preferLive: boolean;
  dragging: boolean;
  tokensHash: string;
}

type LiveState = "idle" | "loading" | "shown" | "failed";

export function ScreenFrame({
  screen,
  online,
  preferLive,
  dragging,
  tokensHash,
}: ScreenFrameProps): React.JSX.Element {
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pngSrc = `/files/${screen.files.png}`;
  /*
    A token-driven screen reads the project's own tokens.css, so the query
    changes whenever a token does and the iframe re-fetches instead of showing
    the previous palette from cache.
  */
  const htmlSrc = screen.tokenDriven
    ? `/files/${screen.files.html}?tokens=${tokensHash.slice(0, 12)}`
    : `/files/${screen.files.html}`;
  /*
    Being token-driven means no CDN and no remote fonts, so the live render
    works offline. Only a baked screen has to wait on the connectivity probe.
  */
  const attemptLive = preferLive && (screen.tokenDriven || online);

  useEffect(() => {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    if (!attemptLive) {
      setLiveState("idle");
      return;
    }
    setLiveState("loading");
    timerRef.current = setTimeout(() => {
      setLiveState((current) => (current === "shown" ? current : "failed"));
    }, LIVE_TIMEOUT_MS);
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, [attemptLive, htmlSrc]);

  function handleLoad(): void {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    setLiveState("shown");
  }

  function handleError(): void {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    setLiveState("failed");
  }

  const showIframe = attemptLive && liveState !== "failed";
  const showStaticNote = !attemptLive || liveState === "failed" || liveState === "loading";

  return (
    <div className="ls-frame" style={{ width: screen.width, height: screen.height }}>
      {screen.tokenDriven && liveState === "shown" ? null : (
        <img className="ls-frame__png" src={pngSrc} alt={screen.title} width={screen.width} height={screen.height} />
      )}
      {showIframe ? (
        <iframe
          className="ls-frame__iframe"
          style={{
            opacity: liveState === "shown" ? 1 : 0,
            pointerEvents: dragging ? "none" : undefined,
          }}
          src={htmlSrc}
          title={screen.title}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
      {showStaticNote && liveState !== "loading" ? (
        <span className="ls-frame__note">{strings.screenCard.staticPreview}</span>
      ) : null}
      {/*
        A live iframe swallows touch, which would make the board impossible to
        pan on a phone once a card covers the viewport. The shield keeps every
        gesture with the canvas; the screen is a picture to judge, not an app
        to operate.
      */}
      <div className="ls-frame__shield" data-canvas-pan="true" aria-hidden="true" />
    </div>
  );
}
