import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Root-space tooltip: follows its trigger, flips and shifts within the viewport. */
export function Tooltip({
  triggerRef,
  id,
  open,
  placement = "top",
  overlayNarrow = false,
  verticalOnly = false,
  avoidSelector,
  avoidRegions,
  className,
  children,
}: {
  triggerRef: RefObject<HTMLElement | null>;
  id: string;
  open: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  overlayNarrow?: boolean;
  verticalOnly?: boolean;
  avoidSelector?: string;
  avoidRegions?: string;
  className?: string;
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
        placement,
        middleware: [
          offset(8),
          flip({
            crossAxis: !verticalOnly,
            fallbackPlacements: verticalOnly
              ? ["bottom"]
              : placement === "bottom"
                ? ["top"]
                : placement === "left"
                  ? ["right", "top", "bottom"]
                  : placement === "right"
                    ? ["left", "top", "bottom"]
                    : ["bottom", "left", "right"],
          }),
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
        if (overlayNarrow && window.matchMedia("(max-width: 700px)").matches) {
          const anchor = trigger.getBoundingClientRect();
          const tip = panel.getBoundingClientRect();
          x = Math.max(
            8,
            Math.min(window.innerWidth - tip.width - 8, anchor.left + (anchor.width - tip.width) / 2),
          );
          y = Math.max(
            8,
            Math.min(window.innerHeight - tip.height - 8, anchor.top + (anchor.height - tip.height) / 2),
          );
        }
        if (avoidSelector) {
          const avoid = document.querySelector(avoidSelector)?.getBoundingClientRect();
          const tip = panel.getBoundingClientRect();
          if (
            avoid &&
            x < avoid.right &&
            x + tip.width > avoid.left &&
            y < avoid.bottom &&
            y + tip.height > avoid.top
          ) {
            const above = avoid.top - tip.height - 8;
            if (above >= 8) y = above;
          }
        }
        if (avoidRegions) {
          const regions = Array.from(document.querySelectorAll(avoidRegions), (element) =>
            element.getBoundingClientRect(),
          );
          const tip = panel.getBoundingClientRect();
          const overlaps = (left: number, top: number, region: DOMRect) =>
            left < region.right &&
            left + tip.width > region.left &&
            top < region.bottom &&
            top + tip.height > region.top;
          if (regions.some((region) => overlaps(x, y, region))) {
            // Keep inspection near the hand when possible, but move it beside the
            // first protected region if a clear, fully visible position exists.
            const primary = regions[0];
            if (primary) {
              const positions = [
                y,
                8,
                ...regions.flatMap((region) => [region.top - tip.height - 8, region.bottom + 8]),
              ];
              const candidates = [primary.left - tip.width - 8, primary.right + 8]
                .filter((left) => left >= 8 && left + tip.width <= window.innerWidth - 8)
                .flatMap((left) => positions.map((top) => ({ left, top })))
                .filter(({ top }) => top >= 8 && top + tip.height <= window.innerHeight - 8)
                .filter(({ left, top }) => !regions.some((region) => overlaps(left, top, region)))
                .sort((a, b) => Math.hypot(a.left - x, a.top - y) - Math.hypot(b.left - x, b.top - y));
              if (candidates[0]) ({ left: x, top: y } = candidates[0]);
            }
          }
        }
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
  }, [present, triggerRef, placement, overlayNarrow, verticalOnly, avoidSelector, avoidRegions]);

  if (!present) return null;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="tooltip"
      className={`card-tooltip${className ? ` ${className}` : ""}`}
      data-side={side}
      data-visible={open && placed ? "true" : undefined}
      aria-hidden={!open || undefined}
    >
      {children}
    </div>,
    document.getElementById("tooltip-root") ?? document.body,
  );
}
