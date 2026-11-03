import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/controls";
import { Icon } from "./icons";

export function ScreenHeader({
  title,
  headingId,
  headingRef,
  onBack,
  onMenu,
  menuRef,
  menuOpen,
  menuId,
}: {
  title: string;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
  onBack: () => void;
  onMenu: () => void;
  menuRef: Ref<HTMLButtonElement>;
  menuOpen: boolean;
  menuId: string;
}) {
  const { t } = useTranslation();
  return (
    <header className="screen-header">
      <div className="screen-header__row">
        <div>
          <Button
            className="chrome-button"
            variant="ghost"
            size="icon"
            aria-label={t("back")}
            onClick={onBack}
          >
            <Icon name="back" />
          </Button>
        </div>
        <h1 id={headingId} ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <div className="screen-header__trailing">
          <Button
            id={menuId}
            ref={menuRef}
            className="chrome-button"
            variant="ghost"
            size="icon"
            aria-label={t("openGameMenu")}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={onMenu}
          >
            <Icon name="menu" />
          </Button>
        </div>
      </div>
      <div className="screen-header__rule" aria-hidden="true" />
    </header>
  );
}
