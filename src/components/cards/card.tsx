import { useEffect, useId, useRef, useState } from "react";
import { Tooltip } from "../ui/tooltip";

export interface CardProps {
  title: string;
  description: string;
  aspect: "portrait" | "landscape";
  art?: string;
}

/** Image-led, selectable card with the same pointer and keyboard inspection. */
export function Card({ title, description, aspect, art }: CardProps) {
  const trigger = useRef<HTMLDivElement>(null);
  const id = useId();
  const pointer = useRef(false);
  const focus = useRef(false);
  const [open, setOpen] = useState(false);
  const [shimmer, setShimmer] = useState(0);

  const show = () => {
    setOpen(true);
    setShimmer((value) => value + 1);
  };
  const dismiss = () => {
    pointer.current = false;
    focus.current = false;
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const onOutsidePress = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismiss();
      }
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null && !focus.current) dismiss();
    };
    const observer = new MutationObserver(() => {
      if (!trigger.current?.isConnected || trigger.current.closest('[hidden], [inert], [aria-hidden="true"]'))
        dismiss();
    });
    for (let element: HTMLElement | null = trigger.current; element; element = element.parentElement) {
      observer.observe(element, { attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden"] });
    }
    window.addEventListener("blur", dismiss);
    document.addEventListener("wheel", dismiss, { capture: true, passive: true });
    document.addEventListener("pointerdown", onOutsidePress, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("blur", dismiss);
      document.removeEventListener("wheel", dismiss, true);
      document.removeEventListener("pointerdown", onOutsidePress, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className={`card-wrap card-wrap--${aspect}`}>
      <div
        ref={trigger}
        role="img"
        tabIndex={0}
        className="game-card"
        data-inspecting={open || undefined}
        aria-label={title}
        aria-describedby={open ? id : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            show();
          }
        }}
        onPointerLeave={() => {
          pointer.current = false;
          if (!focus.current) setOpen(false);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            show();
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current) setOpen(false);
        }}
      >
        <span className="game-card__clip" aria-hidden="true">
          {art ? <img src={art} alt="" /> : <span className="game-card__blank" />}
          {shimmer > 0 && <span className="game-card__shimmer" key={shimmer} />}
        </span>
      </div>
      <Tooltip triggerRef={trigger} id={id} open={open}>
        <strong>{title}</strong>
        <p>{description}</p>
      </Tooltip>
    </div>
  );
}
