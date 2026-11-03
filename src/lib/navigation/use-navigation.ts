import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

type Screen = "menu" | "options" | "cards" | "battle";

export function useNavigation(heading: RefObject<HTMLHeadingElement | null>) {
  const [history, setHistory] = useState<{ screen: Screen; opener: HTMLElement | null }[]>([
    { screen: "menu", opener: null },
  ]);
  const keyboard = useRef(false);
  const restore = useRef<{ element: HTMLElement; id: string } | null>(null);
  const screen = history[history.length - 1]!.screen;

  useLayoutEffect(() => {
    const onPointer = () => {
      keyboard.current = false;
    };
    const onKey = (event: KeyboardEvent) => {
      if (["Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
        keyboard.current = true;
      if (event.repeat && ["Enter", " ", "Escape"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!event.key.startsWith("Arrow") || event.altKey || event.ctrlKey || event.metaKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLSelectElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement &&
          ((active.type === "range" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) ||
            !["range", "checkbox"].includes(active.type)))
      )
        return;
      const root: ParentNode = document.querySelector("dialog[open]") ?? document;
      const controls = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [role="img"][tabindex="0"]',
        ),
      ].filter(
        (el) => !el.closest('[hidden], [inert], [aria-hidden="true"]') && el.getClientRects().length > 0,
      );
      if (!controls.length) return;
      if (!(active instanceof HTMLElement) || !controls.includes(active)) {
        controls[0]?.focus();
        event.preventDefault();
        return;
      }
      const box = active.getBoundingClientRect();
      const x = box.left + box.width / 2,
        y = box.top + box.height / 2;
      const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
      const sign = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      const candidates = controls
        .filter((el) => el !== active)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const dx = rect.left + rect.width / 2 - x,
            dy = rect.top + rect.height / 2 - y;
          return {
            el,
            primary: (horizontal ? dx : dy) * sign,
            cross: Math.abs(horizontal ? dy : dx),
            crossGap: horizontal ? Math.max(0, box.top - rect.bottom, rect.top - box.bottom) : 0,
          };
        })
        .filter(({ primary }) => primary > 1)
        .sort(
          (a, b) =>
            Number(a.crossGap > 0) - Number(b.crossGap > 0) ||
            a.primary + 0.5 * a.cross - (b.primary + 0.5 * b.cross),
        );
      if (candidates[0]) {
        event.preventDefault();
        candidates[0].el.focus();
      }
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("wheel", onPointer, true);
    window.addEventListener("blur", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("wheel", onPointer, true);
      window.removeEventListener("blur", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  useEffect(() => {
    if (keyboard.current) {
      const saved = restore.current;
      const target = saved?.element.isConnected
        ? saved.element
        : saved?.id
          ? document.getElementById(saved.id)
          : null;
      if (target && !target.matches(":disabled")) target.focus();
      else if (screen !== "menu") heading.current?.focus();
    }
    restore.current = null;
  }, [screen, heading]);

  function open(next: Screen, origin?: HTMLElement | null) {
    const opener = origin ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setHistory((current) => [...current, { screen: next, opener }]);
  }
  function back() {
    if (history.length <= 1) return;
    const opener = history[history.length - 1]?.opener;
    restore.current = opener ? { element: opener, id: opener.id } : null;
    setHistory((current) => current.slice(0, -1));
  }
  function home() {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
    restore.current = { element: active, id: "menu-collection" };
    setHistory([{ screen: "menu", opener: null }]);
  }
  return { screen, open, back, home };
}
