import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/controls";
import { Icon } from "./icons";

export type MenuDestination = "menu" | "cards" | "options";
export function GameMenu({
  current,
  anchor,
  onClose,
  onSelect,
}: {
  current: MenuDestination;
  anchor: DOMRect;
  onClose: () => void;
  onSelect: (screen: MenuDestination) => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [centered, setCentered] = useState(false);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const onResize = () => setCentered(true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (dialog.open) dialog.close();
    };
  }, []);
  const items = [
    { id: "menu" as const, text: t("mainMenu"), icon: "home" as const },
    { id: "cards" as const, text: t("collection"), icon: "collection" as const },
    { id: "options" as const, text: t("options"), icon: "options" as const },
  ].filter((item) => item.id !== current);
  return (
    <dialog
      ref={dialogRef}
      className={`game-menu ${centered ? "game-menu--centered" : ""}`}
      aria-label={t("gameMenu")}
      style={
        centered
          ? undefined
          : {
              top: Math.min(anchor.bottom + 8, window.innerHeight / 2),
              right: Math.max(8, window.innerWidth - anchor.right),
            }
      }
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
        if (event.key === "Tab") {
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
          ];
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first && last) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last && first) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          onClose();
      }}
    >
      {items.map((item) => (
        <Button key={item.id} variant="ghost" className="game-menu__item" onClick={() => onSelect(item.id)}>
          <Icon name={item.icon} />
          {item.text}
        </Button>
      ))}
    </dialog>
  );
}
