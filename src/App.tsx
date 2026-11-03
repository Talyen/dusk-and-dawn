import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Background } from "./components/effects/background";
import { sampleCatalog, sampleDiscoveredIds } from "./lib/collection/catalog";
import { keywordPlasma } from "./lib/keywords/keywords";
import { CardBrowser } from "./components/browsing/card-browser";
import { getFullscreen, observeFullscreen, setFullscreen } from "./lib/display/fullscreen";
import { useNavigation } from "./lib/navigation/use-navigation";
import { playUiCue } from "./lib/feedback/ui-feedback";
import { useUiScale } from "./lib/display/scale";
import { Button, ScreenShell, Surface, Switch } from "./components/ui/controls";
import { applySettings, readSettings, saveSettings, type Settings } from "./lib/settings/settings";

export function App() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(readSettings);
  const [saveFailed, setSaveFailed] = useState(false);
  const [fullscreen, setFullscreenState] = useState(false);
  const [displayBusy, setDisplayBusy] = useState(false);
  const [displayFailed, setDisplayFailed] = useState(false);
  const [hovered, setHovered] = useState<{ id: string; keywords: readonly string[] } | null>(null);
  const onInspectChange = useCallback((id: string, keywords: readonly string[] | null) => {
    setHovered((current) => (keywords === null ? (current?.id === id ? null : current) : { id, keywords }));
  }, []);
  useUiScale(settings.gameSizePercent);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { screen, open, back } = useNavigation(headingRef);

  useLayoutEffect(() => {
    applySettings(settings);
  }, [settings]);
  useEffect(() => {
    let active = true;
    void getFullscreen()
      .then((value) => {
        if (active) setFullscreenState(value);
      })
      .catch(() => {
        if (active) setDisplayFailed(true);
      });
    const unsubscribe = observeFullscreen(setFullscreenState);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (screen === "menu") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) back();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function changeFullscreen(enabled: boolean) {
    setDisplayBusy(true);
    setDisplayFailed(false);
    try {
      setFullscreenState(await setFullscreen(enabled));
      playUiCue("change");
    } catch {
      setDisplayFailed(true);
    } finally {
      setDisplayBusy(false);
    }
  }

  function updateSettings(next: Settings) {
    playUiCue("change");
    setSettings(next);
    setSaveFailed(!saveSettings(next));
  }

  return (
    <ScreenShell className="shell">
      <Background
        pair={keywordPlasma(hovered?.keywords ?? [])}
        reducedMotion={settings.reducedMotion}
        glow={settings.backgroundGlow}
        particles={settings.backgroundParticles}
      />
      {screen === "menu" ? (
        <section className="intro" aria-labelledby="title">
          <p className="eyebrow">{t("tagline")}</p>
          <h1 id="title">{t("title")}</h1>
          <p className="description">{t("description")}</p>
          <div className="menu-actions">
            <Button size="lg" aria-disabled="true" aria-describedby="play-status">
              {t("play")}
            </Button>
            <Button id="menu-cards" variant="outline" onClick={() => open("cards")}>
              {t("collection")}
            </Button>
            <Button id="menu-options" variant="outline" onClick={() => open("options")}>
              {t("options")}
            </Button>
          </div>
          <p className="status" id="play-status">
            {t("playUnavailable")}
          </p>
        </section>
      ) : screen === "cards" ? (
        <section className="cards-screen" aria-labelledby="cards-title">
          <header className="options-header">
            <p className="eyebrow">{t("sampleCollection")}</p>
            <h1 id="cards-title" ref={headingRef} tabIndex={-1}>
              {t("collection")}
            </h1>
          </header>
          <CardBrowser
            catalog={sampleCatalog}
            discoveredIds={sampleDiscoveredIds}
            onInspectChange={onInspectChange}
          />
          <Button variant="outline" onClick={back}>
            {t("back")}
          </Button>
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
              <span>{t("gameSize")}</span>
              <span className="range-control">
                <input
                  type="range"
                  min="80"
                  max="120"
                  step="5"
                  value={settings.gameSizePercent}
                  onChange={(event) =>
                    updateSettings({ ...settings, gameSizePercent: Number(event.target.value) })
                  }
                />
                <output>{settings.gameSizePercent}%</output>
              </span>
            </label>
            <label className="setting-row">
              <span>{t("tooltipSize")}</span>
              <span className="range-control">
                <input
                  type="range"
                  min="90"
                  max="125"
                  step="5"
                  value={settings.tooltipSizePercent}
                  onChange={(event) =>
                    updateSettings({ ...settings, tooltipSizePercent: Number(event.target.value) })
                  }
                />
                <output>{settings.tooltipSizePercent}%</output>
              </span>
            </label>
            <label className="setting-row">
              <span>{t("fullscreen")}</span>
              <Switch
                checked={fullscreen}
                disabled={displayBusy}
                onCheckedChange={(enabled) => {
                  void changeFullscreen(enabled);
                }}
              />
            </label>
            {displayFailed && (
              <p className="save-error" role="status">
                {t("displayError")}
              </p>
            )}
            <label className="setting-row">
              <span>{t("reducedMotion")}</span>
              <Switch
                checked={settings.reducedMotion}
                onCheckedChange={(reducedMotion) => updateSettings({ ...settings, reducedMotion })}
              />
            </label>
            <h2>{t("background")}</h2>
            {(["backgroundGlow", "backgroundParticles"] as const).map((field) => (
              <label className="setting-row" key={field}>
                <span>{t(field)}</span>
                <span className="range-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings[field]}
                    onChange={(event) => updateSettings({ ...settings, [field]: Number(event.target.value) })}
                  />
                  <output>{settings[field]}%</output>
                </span>
              </label>
            ))}
            {saveFailed && (
              <p className="save-error" role="status">
                {t("settingsSaveError")}
              </p>
            )}
          </Surface>
          <Button variant="outline" onClick={back}>
            {t("back")}
          </Button>
        </section>
      )}
    </ScreenShell>
  );
}
