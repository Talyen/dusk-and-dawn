import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ScreenShell, Surface, Switch } from "./components/ui/controls";
import { applySettings, readSettings, saveSettings, type Settings } from "./lib/settings/settings";

export function App() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<"menu" | "options">("menu");
  const [settings, setSettings] = useState(readSettings);
  const [saveFailed, setSaveFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const wasInOptions = useRef(false);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);
  useEffect(() => {
    if (screen === "options") {
      headingRef.current?.focus();
      wasInOptions.current = true;
    } else if (wasInOptions.current) {
      optionsRef.current?.focus();
      wasInOptions.current = false;
    }
  }, [screen]);
  useEffect(() => {
    if (screen !== "options") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScreen("menu");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen]);

  function updateSettings(next: Settings) {
    setSettings(next);
    setSaveFailed(!saveSettings(next));
  }

  return (
    <ScreenShell className="shell">
      <div className="horizon" aria-hidden="true">
        <span className="sun" />
      </div>
      {screen === "menu" ? (
        <section className="intro" aria-labelledby="title">
          <p className="eyebrow">{t("tagline")}</p>
          <h1 id="title">{t("title")}</h1>
          <p className="description">{t("description")}</p>
          <div className="menu-actions">
            <Button size="lg" disabled aria-describedby="play-status">
              {t("play")}
            </Button>
            <Button ref={optionsRef} variant="outline" onClick={() => setScreen("options")}>
              {t("options")}
            </Button>
          </div>
          <p className="status" id="play-status">
            {t("status")}
          </p>
        </section>
      ) : (
        <section className="options-screen" aria-labelledby="options-title">
          <header className="options-header">
            <p className="eyebrow">{t("title")}</p>
            <h1 id="options-title" ref={headingRef} tabIndex={-1}>
              {t("options")}
            </h1>
          </header>
          <Surface className="options-panel">
            <h2>{t("audio")}</h2>
            {(["music", "sound"] as const).map((channel) => (
              <label className="setting-row" key={channel}>
                <span>{t(channel)}</span>
                <span className="range-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(settings[channel] * 100)}
                    onChange={(event) =>
                      updateSettings({ ...settings, [channel]: Number(event.target.value) / 100 })
                    }
                  />
                  <output>{Math.round(settings[channel] * 100)}%</output>
                </span>
              </label>
            ))}
            <h2>{t("display")}</h2>
            <label className="setting-row">
              <span>{t("reducedMotion")}</span>
              <Switch
                checked={settings.reducedMotion}
                onCheckedChange={(reducedMotion) => updateSettings({ ...settings, reducedMotion })}
              />
            </label>
            {saveFailed && (
              <p className="save-error" role="status">
                {t("settingsSaveError")}
              </p>
            )}
          </Surface>
          <Button variant="outline" onClick={() => setScreen("menu")}>
            {t("back")}
          </Button>
        </section>
      )}
    </ScreenShell>
  );
}
