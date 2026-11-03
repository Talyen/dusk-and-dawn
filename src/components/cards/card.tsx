import { useEffect, useId, useRef, useState } from "react";
import { Tooltip } from "../ui/tooltip";
import { useTranslation } from "react-i18next";
import { resolveKeywords } from "../../lib/keywords/keywords";
import { KeywordDescription, ShineBorder, ShineText } from "../effects/shine";

export interface CardProps {
  title: string;
  description: string;
  aspect: "portrait" | "landscape";
  art?: string;
  entryId: string;
  tooltipSide?: "left" | "right";
  discovered: boolean;
  keywordIds: readonly string[];
  onInspectChange: (id: string, keywordIds: readonly string[] | null) => void;
}

/** Collection entries reveal details only on hover or keyboard focus. */
export function Card({
  title,
  description,
  aspect,
  art,
  entryId,
  tooltipSide,
  discovered,
  keywordIds,
  onInspectChange,
}: CardProps) {
  const { t } = useTranslation();
  const labels = resolveKeywords(keywordIds).map((keyword) => ({
    id: keyword.id,
    label: t(keyword.labelKey),
  }));

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
    onInspectChange(entryId, discovered ? keywordIds : []);
    return () => onInspectChange(entryId, null);
  }, [open, entryId, discovered, keywordIds, onInspectChange]);
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
        data-discovered={discovered}
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
          {art && discovered ? <img src={art} alt="" /> : <span className="game-card__blank" />}
          {!discovered && <span className="game-card__unknown">?</span>}
          {shimmer > 0 && <span className="game-card__shimmer" key={shimmer} />}
        </span>
        {open && <ShineBorder keywordIds={keywordIds} />}
      </div>
      <Tooltip triggerRef={trigger} id={id} open={open} {...(tooltipSide ? { placement: tooltipSide } : {})}>
        <strong>{discovered ? <ShineText keywordIds={keywordIds}>{title}</ShineText> : title}</strong>
        <p>{discovered ? <KeywordDescription text={description} labels={labels} /> : description}</p>
      </Tooltip>
    </div>
  );
}
