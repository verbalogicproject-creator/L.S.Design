import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Screen } from "../../../shared/schema.ts";
import { ScreenCard } from "./ScreenCard.tsx";
import { patchCanvas } from "../api.ts";
import { strings } from "../strings.ts";
import type { KeyboardAction } from "./DecisionBar.tsx";

/**
 * A whole board of 1440px screens has to fit a phone viewport, so the lower
 * bound is well below the 0.1 a desktop canvas would need.
 */
const MIN_SCALE = 0.02;
const MAX_SCALE = 2;
const GUTTER = 80;
const PAN_STEP = 40;
const CANVAS_PATCH_DEBOUNCE_MS = 400;
/** A tap on a card header must not move the card; only a real drag does. */
const DRAG_THRESHOLD_PX = 6;

export interface CanvasHandle {
  fitAll: () => void;
  zoomActual: () => void;
  resetLayout: () => void;
  centerOn: (screenId: string) => void;
}

export interface CanvasProps {
  screens: Screen[];
  online: boolean;
  focusedScreenId: string | null;
  keyboardAction: KeyboardAction | null;
  tokensHash: string;
  onFocusCard: (screenId: string) => void;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { kind: "pan"; pointerId: number; startClient: Point; startPan: Point }
  | {
      kind: "card";
      pointerId: number;
      screenId: string;
      startClient: Point;
      startPos: Point;
      moved: boolean;
    }
  | {
      kind: "pinch";
      a: number;
      b: number;
      startDistance: number;
      startScale: number;
      startPan: Point;
      startMidpoint: Point;
    }
  | null;

function computeDefaultPositions(screens: Screen[]): Record<string, Point> {
  const positions: Record<string, Point> = {};
  const desktops = screens.filter((screen) => screen.device === "desktop");
  const others = screens.filter((screen) => screen.device !== "desktop");

  let cursorX = 0;
  let maxHeight = 0;
  for (const screen of desktops) {
    positions[screen.id] = { x: cursorX, y: 0 };
    cursorX += screen.width + GUTTER;
    maxHeight = Math.max(maxHeight, screen.height);
  }

  let cursorX2 = 0;
  const rowY = maxHeight > 0 ? maxHeight + GUTTER : 0;
  for (const screen of others) {
    positions[screen.id] = { x: cursorX2, y: rowY };
    cursorX2 += screen.width + GUTTER;
  }

  return positions;
}

/** How much of the board must stay on screen; you can never lose it entirely. */
const KEEP_VISIBLE_PX = 64;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** A pan may start on empty canvas or on a card's shield, never on its chrome. */
function isPanSurface(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.classList.contains("ls-canvas") || target.dataset.canvasPan === "true";
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { screens, online, focusedScreenId, keyboardAction, tokensHash, onFocusCard },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<Point>({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<Record<string, Point>>({});

  // Mirrors of the transform so gesture math reads the live value without
  // re-registering the window listeners on every frame.
  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const applyTransformRef = useRef<(pan: Point, scale: number) => void>(() => {});
  const gestureRef = useRef<Gesture>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const patchTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  /** Once the person has framed the board themselves, stop re-framing it for them. */
  const userFramedRef = useRef(false);
  const didFitRef = useRef(false);

  const defaultPositions = useMemo(() => computeDefaultPositions(screens), [screens]);

  const effectivePosition = useCallback(
    (screen: Screen): Point => {
      const override = positionOverrides[screen.id];
      if (override) return override;
      if (screen.canvas.x !== 0 || screen.canvas.y !== 0) return screen.canvas;
      return defaultPositions[screen.id] ?? { x: 0, y: 0 };
    },
    [positionOverrides, defaultPositions],
  );
  const effectivePositionRef = useRef(effectivePosition);
  effectivePositionRef.current = effectivePosition;

  const screensRef = useRef(screens);
  screensRef.current = screens;

  const boundsOf = useCallback((list: Screen[]): Bounds | null => {
    if (list.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const screen of list) {
      const pos = effectivePositionRef.current(screen);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + screen.width);
      maxY = Math.max(maxY, pos.y + screen.height);
    }
    return { minX, minY, maxX, maxY };
  }, []);

  /**
   * Zooming and panning are unbounded by nature, and on a touch screen it is
   * very easy to fling the board past the edge and be left staring at an empty
   * grid with no way back. Every transform is clamped so a strip of the board
   * always stays on screen.
   */
  const applyTransform = useCallback(
    (nextPan: Point, nextScale: number) => {
      const container = containerRef.current;
      const bounds = boundsOf(screensRef.current);
      if (!container || !bounds) {
        setPan(nextPan);
        setScale(nextScale);
        return;
      }
      const rect = container.getBoundingClientRect();
      const left = nextPan.x + bounds.minX * nextScale;
      const right = nextPan.x + bounds.maxX * nextScale;
      const top = nextPan.y + bounds.minY * nextScale;
      const bottom = nextPan.y + bounds.maxY * nextScale;
      const clamped = { ...nextPan };
      if (right < KEEP_VISIBLE_PX) clamped.x += KEEP_VISIBLE_PX - right;
      else if (left > rect.width - KEEP_VISIBLE_PX) clamped.x -= left - (rect.width - KEEP_VISIBLE_PX);
      if (bottom < KEEP_VISIBLE_PX) clamped.y += KEEP_VISIBLE_PX - bottom;
      else if (top > rect.height - KEEP_VISIBLE_PX) clamped.y -= top - (rect.height - KEEP_VISIBLE_PX);
      setPan(clamped);
      setScale(nextScale);
    },
    [boundsOf],
  );

  applyTransformRef.current = applyTransform;

  const fitAll = useCallback(() => {
    const container = containerRef.current;
    const list = screensRef.current;
    if (!container || list.length === 0) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const bounds = boundsOf(list);
    if (!bounds) return;
    const { minX, minY } = bounds;
    const boundsWidth = Math.max(1, bounds.maxX - minX);
    const boundsHeight = Math.max(1, bounds.maxY - minY);
    // A fixed 80px inset would consume most of a phone canvas, so scale it.
    const padding = Math.min(40, rect.width * 0.06, rect.height * 0.06);
    const nextScale = clampScale(
      Math.min((rect.width - padding * 2) / boundsWidth, (rect.height - padding * 2) / boundsHeight),
    );
    setScale(nextScale);
    setPan({
      x: padding - minX * nextScale + Math.max(0, (rect.width - padding * 2 - boundsWidth * nextScale) / 2),
      y: padding - minY * nextScale,
    });
  }, [boundsOf]);

  /** Frames one screen's top edge, which is what "show me this one" means. */
  const centerOn = useCallback((screenId: string) => {
    const container = containerRef.current;
    const screen = screensRef.current.find((candidate) => candidate.id === screenId);
    if (!container || !screen) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const pos = effectivePositionRef.current(screen);
    const padding = Math.min(24, rect.width * 0.05);
    const nextScale = clampScale((rect.width - padding * 2) / screen.width);
    userFramedRef.current = true;
    setScale(nextScale);
    setPan({ x: padding - pos.x * nextScale, y: padding - pos.y * nextScale });
  }, []);

  const resetLayout = useCallback(() => {
    setPositionOverrides({});
    for (const screen of screensRef.current) {
      if (screen.canvas.x !== 0 || screen.canvas.y !== 0) {
        void patchCanvas(screen.id, { x: 0, y: 0 });
      }
    }
    userFramedRef.current = false;
    // The board re-frames once the cleared positions arrive over the stream.
    window.setTimeout(fitAll, 60);
  }, [fitAll]);

  useImperativeHandle(
    ref,
    () => ({
      fitAll: () => {
        userFramedRef.current = true;
        fitAll();
      },
      zoomActual: () => {
        userFramedRef.current = true;
        setScale(1);
      },
      resetLayout,
      centerOn,
    }),
    [fitAll, resetLayout, centerOn],
  );

  // Frame the board the first time screens land, and again whenever the
  // visible set changes -- switching the device or state filter is a set
  // change, and leaving the old framing in place is what made the canvas look
  // broken after a filter switch.
  const visibleKey = screens.map((screen) => screen.id).join(",");
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastKeyRef.current === visibleKey) return;
    // Record the empty set too, so filtering everything away and back again
    // still counts as a change and re-frames the board.
    lastKeyRef.current = visibleKey;
    if (screens.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    didFitRef.current = true;
    userFramedRef.current = false;
    fitAll();
  }, [visibleKey, screens.length, fitAll]);

  // Rotating the phone, or the panel opening and closing, re-frames the board
  // until the person has framed it themselves.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (userFramedRef.current || !didFitRef.current) return;
      fitAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitAll]);

  useEffect(() => {
    const timers = patchTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const schedulePatch = useCallback((screenId: string, pos: Point): void => {
    const timers = patchTimersRef.current;
    const existing = timers.get(screenId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      timers.delete(screenId);
      void patchCanvas(screenId, pos);
    }, CANVAS_PATCH_DEBOUNCE_MS);
    timers.set(screenId, timer);
  }, []);

  // One set of window listeners for the life of the canvas; the active gesture
  // lives in a ref so a pointer that leaves the element still finishes cleanly.
  useEffect(() => {
    function distance(a: Point, b: Point): number {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function onMove(event: PointerEvent): void {
      const pointers = pointersRef.current;
      if (pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      const gesture = gestureRef.current;
      if (!gesture) return;

      if (gesture.kind === "pinch") {
        const a = pointers.get(gesture.a);
        const b = pointers.get(gesture.b);
        if (!a || !b) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const nextScale = clampScale(
          gesture.startScale * (distance(a, b) / Math.max(1, gesture.startDistance)),
        );
        const midpoint = {
          x: (a.x + b.x) / 2 - rect.left,
          y: (a.y + b.y) / 2 - rect.top,
        };
        // Keep the world point under the pinch centre pinned to the fingers.
        const worldX = (gesture.startMidpoint.x - gesture.startPan.x) / gesture.startScale;
        const worldY = (gesture.startMidpoint.y - gesture.startPan.y) / gesture.startScale;
        applyTransformRef.current(
          { x: midpoint.x - worldX * nextScale, y: midpoint.y - worldY * nextScale },
          nextScale,
        );
        return;
      }

      if (gesture.pointerId !== event.pointerId) return;

      if (gesture.kind === "pan") {
        applyTransformRef.current(
          {
            x: gesture.startPan.x + (event.clientX - gesture.startClient.x),
            y: gesture.startPan.y + (event.clientY - gesture.startClient.y),
          },
          scaleRef.current,
        );
        return;
      }

      const rawDx = event.clientX - gesture.startClient.x;
      const rawDy = event.clientY - gesture.startClient.y;
      if (!gesture.moved && Math.hypot(rawDx, rawDy) < DRAG_THRESHOLD_PX) return;
      gesture.moved = true;
      const currentScale = scaleRef.current;
      const nextPos = {
        x: gesture.startPos.x + rawDx / currentScale,
        y: gesture.startPos.y + rawDy / currentScale,
      };
      setPositionOverrides((prev) => ({ ...prev, [gesture.screenId]: nextPos }));
      schedulePatch(gesture.screenId, nextPos);
    }

    function onUp(event: PointerEvent): void {
      pointersRef.current.delete(event.pointerId);
      const gesture = gestureRef.current;
      if (!gesture) return;
      if (gesture.kind === "pinch") {
        if (event.pointerId === gesture.a || event.pointerId === gesture.b) {
          gestureRef.current = null;
          setDragging(false);
        }
        return;
      }
      if (gesture.pointerId !== event.pointerId) return;
      gestureRef.current = null;
      setDragging(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [schedulePatch]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    userFramedRef.current = true;
    const rect = container.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const prevScale = scaleRef.current;
    const prevPan = panRef.current;
    const nextScale = clampScale(prevScale * (event.deltaY < 0 ? 1.1 : 0.9));
    const worldX = (pointerX - prevPan.x) / prevScale;
    const worldY = (pointerY - prevPan.y) / prevScale;
    applyTransform({ x: pointerX - worldX * nextScale, y: pointerY - worldY * nextScale }, nextScale);
  }, [applyTransform]);

  // Capture phase: every pointer is registered before the target's own handler
  // decides what gesture to begin, so the second finger can promote to a pinch.
  const handlePointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size !== 2) return;
    const container = containerRef.current;
    if (!container) return;
    const [first, second] = [...pointers.entries()];
    if (!first || !second) return;
    const rect = container.getBoundingClientRect();
    userFramedRef.current = true;
    gestureRef.current = {
      kind: "pinch",
      a: first[0],
      b: second[0],
      startDistance: Math.max(1, Math.hypot(first[1].x - second[1].x, first[1].y - second[1].y)),
      startScale: scaleRef.current,
      startPan: panRef.current,
      startMidpoint: {
        x: (first[1].x + second[1].x) / 2 - rect.left,
        y: (first[1].y + second[1].y) / 2 - rect.top,
      },
    };
    setDragging(true);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.kind === "pinch") return;
    if (!isPanSurface(event.target)) return;
    userFramedRef.current = true;
    gestureRef.current = {
      kind: "pan",
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: panRef.current,
    };
    setDragging(true);
  }, []);

  const handleHeaderPointerDown = useCallback(
    (screenId: string, event: ReactPointerEvent<HTMLDivElement>) => {
      if (gestureRef.current?.kind === "pinch") return;
      const screen = screensRef.current.find((candidate) => candidate.id === screenId);
      if (!screen) return;
      gestureRef.current = {
        kind: "card",
        pointerId: event.pointerId,
        screenId,
        startClient: { x: event.clientX, y: event.clientY },
        startPos: effectivePositionRef.current(screen),
        moved: false,
      };
      setDragging(true);
    },
    [],
  );

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? PAN_STEP * 3 : PAN_STEP;
    const current = panRef.current;
    if (event.key === "ArrowLeft") applyTransform({ ...current, x: current.x + step }, scaleRef.current);
    else if (event.key === "ArrowRight") applyTransform({ ...current, x: current.x - step }, scaleRef.current);
    else if (event.key === "ArrowUp") applyTransform({ ...current, y: current.y + step }, scaleRef.current);
    else if (event.key === "ArrowDown") applyTransform({ ...current, y: current.y - step }, scaleRef.current);
    else return;
    userFramedRef.current = true;
    event.preventDefault();
  }

  return (
    <div
      ref={containerRef}
      className={`ls-canvas${dragging ? " ls-canvas--dragging" : ""}`}
      onWheel={handleWheel}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => {
        userFramedRef.current = false;
        fitAll();
      }}
      tabIndex={0}
      role="application"
      aria-label="Screen canvas"
    >
      <div
        className="ls-canvas__world"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        {screens.map((screen) => {
          const pos = effectivePosition(screen);
          return (
            <ScreenCard
              key={screen.id}
              screen={screen}
              x={pos.x}
              y={pos.y}
              online={online}
              focused={focusedScreenId === screen.id}
              dragging={dragging}
              keyboardAction={keyboardAction}
              tokensHash={tokensHash}
              onHeaderPointerDown={handleHeaderPointerDown}
              onFocusCard={onFocusCard}
            />
          );
        })}
      </div>
      {screens.length === 0 ? (
        <p className="ls-canvas__empty">{strings.canvas.emptyFiltered}</p>
      ) : null}
    </div>
  );
});

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}
