import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Root-space tooltip: follows its trigger, flips and shifts within the viewport. */
export function Tooltip({
  triggerRef,
  id,
  open,
  children,
}: {
  triggerRef: RefObject<HTMLElement | null>;
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const present = mounted || open;
  const [placed, setPlaced] = useState(false);
  const [side, setSide] = useState("top");

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
      setPlaced(false);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!present || !trigger || !panel) return;
    let live = true;
    let sequence = 0;
    const update = () => {
      const current = ++sequence;
      void computePosition(trigger, panel, {
        strategy: "fixed",
        placement: "top",
        middleware: [
          offset(8),
          flip({ fallbackPlacements: ["bottom", "left", "right"] }),
          shift({ padding: 8, crossAxis: true }),
          size({
            padding: 8,
            apply({ availableWidth, elements }) {
              elements.floating.style.maxWidth = `min(calc(20 * var(--tooltip-unit)), ${Math.max(0, availableWidth)}px)`;
            },
          }),
        ],
      }).then(({ x, y, placement }) => {
        if (!live || current !== sequence) return;
        Object.assign(panel.style, { left: `${x}px`, top: `${y}px` });
        setSide(placement.split("-")[0] ?? "top");
        setPlaced(true);
      });
    };
    const stop = autoUpdate(trigger, panel, update);
    return () => {
      live = false;
      stop();
    };
  }, [present, triggerRef]);

  if (!present) return null;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="tooltip"
      className="card-tooltip"
      data-side={side}
      data-visible={open && placed ? "true" : undefined}
      aria-hidden={!open || undefined}
    >
      {children}
    </div>,
    document.getElementById("tooltip-root") ?? document.body,
  );
}
