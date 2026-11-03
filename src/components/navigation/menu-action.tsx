import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { PlasmaColorPair } from "../../lib/animation/plasma-colors";
import { Button } from "../ui/controls";
import { Tooltip } from "../ui/tooltip";
import { Icon } from "./icons";

type MenuIcon = "play" | "collection" | "options" | "quit";
export function MenuAction({
  id,
  icon,
  label,
  reason,
  primary = false,
  color,
  onHighlight,
  onClick,
}: {
  id: string;
  icon: MenuIcon;
  label: string;
  reason?: string;
  primary?: boolean;
  color: PlasmaColorPair | null;
  onHighlight: (id: string, color: PlasmaColorPair | null) => void;
  onClick?: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const pointer = useRef(false);
  const focus = useRef(false);
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  useEffect(() => {
    if (!visible || !color) return;
    onHighlight(id, color);
    return () => onHighlight(id, null);
  }, [visible, color, id, onHighlight]);
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => {
      pointer.current = false;
      focus.current = false;
      setVisible(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("blur", dismiss);
    document.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("blur", dismiss);
      document.removeEventListener("keydown", keydown);
    };
  }, [visible]);
  const iconNode: ReactNode = <Icon name={icon} className={`menu-icon menu-icon--${icon}`} />;
  return (
    <div className="menu-action">
      <Button
        id={id}
        ref={trigger}
        size="lg"
        variant={primary ? "primary" : "outline"}
        aria-disabled={reason ? "true" : undefined}
        aria-describedby={reason && visible ? tooltipId : undefined}
        onClick={onClick}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            pointer.current = true;
            setVisible(true);
          }
        }}
        onPointerLeave={() => {
          pointer.current = false;
          if (!focus.current) setVisible(false);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            focus.current = true;
            setVisible(true);
          }
        }}
        onBlur={() => {
          focus.current = false;
          if (!pointer.current) setVisible(false);
        }}
      >
        {iconNode}
        {label}
      </Button>
      {reason && (
        <Tooltip triggerRef={trigger} id={tooltipId} open={visible} placement="right">
          <strong aria-hidden="true">{label}</strong>
          <p>{reason}</p>
        </Tooltip>
      )}
    </div>
  );
}
