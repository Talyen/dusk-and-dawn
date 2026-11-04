import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

/** A hold inspects without triggering the card's tap action; scrolling cancels it. */
export function useTouchInspection<T extends HTMLElement>(onInspect: () => void) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const held = useRef(false);
  const lastTouch = useRef(false);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clear(), []);
  return {
    onPointerDown(event: PointerEvent<T>) {
      lastTouch.current = event.pointerType === "touch";
      if (!lastTouch.current) return;
      clear();
      held.current = false;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (start.current) {
          held.current = true;
          onInspect();
        }
      }, 500);
    },
    onPointerMove(event: PointerEvent<T>) {
      const point = start.current;
      if (
        point &&
        point.id === event.pointerId &&
        Math.hypot(event.clientX - point.x, event.clientY - point.y) > 10
      ) {
        clear();
        start.current = null;
      }
    },
    onPointerUp() {
      clear();
      start.current = null;
    },
    onPointerCancel() {
      clear();
      start.current = null;
      held.current = false;
    },
    onContextMenu(event: MouseEvent<T>) {
      if (lastTouch.current) event.preventDefault();
    },
    consumeClick() {
      const value = held.current;
      held.current = false;
      return value;
    },
    wasTouch() {
      return lastTouch.current;
    },
  };
}
