import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Battle } from "./components/game/battle";
import { Background } from "./components/effects/background";
import { CardBrowser, initialCollectionView } from "./components/browsing/card-browser";
import { GameMenu, type MenuDestination } from "./components/navigation/game-menu";
import { MenuAction } from "./components/navigation/menu-action";
import { ScreenHeader } from "./components/navigation/screen-header";
import { ScreenShell, Switch, TabBar } from "./components/ui/controls";
import type { PlasmaColorPair } from "./lib/animation/plasma-colors";
import { readDiscoveries, realCatalog, saveDiscoveries } from "./lib/collection/catalog";
import { getFullscreen, observeFullscreen, setFullscreen } from "./lib/display/fullscreen";
import { useUiScale } from "./lib/display/scale";
import { playUiCue } from "./lib/feedback/ui-feedback";
import { keywordPlasma } from "./lib/keywords/keywords";
import { useNavigation } from "./lib/navigation/use-navigation";
import { applySettings, readSettings, saveSettings, type Settings } from "./lib/settings/settings";

const PLAY_COLOR: PlasmaColorPair = { primary: "#cd9b51", secondary: "#49352b" };
const COLLECTION_COLOR: PlasmaColorPair = { primary: "#e6c58e", secondary: "#986b32" };
const OPTIONS_COLOR: PlasmaColorPair = { primary: "#a1a1aa", secondary: "#27272a" };

type Desktop = { quit(): Promise<void> };

export function App() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(readSettings);
  const [discoveries, setDiscoveries] = useState(() => {
    try {
      return readDiscoveries(window.localStorage);
    } catch {
      return readDiscoveries(null);
    }
  });
  const onDiscover = useCallback((ids: readonly string[]) => {
    setDiscoveries((current) => {
      if (ids.every((id) => current.has(id))) return current;
      const next = new Set([...current, ...ids]);
      try {
        saveDiscoveries(window.localStorage, next);
      } catch {
        /* Keep discoveries in memory. */
      }
      return next;
    });
  }, []);
  const [saveFailed, setSaveFailed] = useState(false);
  const [fullscreen, setFullscreenState] = useState(false);
  const [displayBusy, setDisplayBusy] = useState(false);
  const [displayFailed, setDisplayFailed] = useState(false);
  const [hovered, setHovered] = useState<{ id: string; pair: PlasmaColorPair } | null>(null);
  const [collectionView, setCollectionView] = useState(initialCollectionView);
  const [optionsTab, setOptionsTab] = useState<"display" | "sound">("display");
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const { screen, open, back, home } = useNavigation(headingRef);
  const desktop = (window as unknown as { duskDesktop?: Desktop }).duskDesktop;
  useUiScale(settings.gameSizePercent);

  const onHighlight = useCallback((id: string, pair: PlasmaColorPair | null) => {
    setHovered((current) => (pair === null ? (current?.id === id ? null : current) : { id, pair }));
  }, []);
  const onInspectChange = useCallback(
    (id: string, keywords: readonly string[] | null) => {
      onHighlight(id, keywords === null ? null : keywordPlasma(keywords));
    },
    [onHighlight],
  );

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
    if (screen === "menu" || screen === "battle" || menuAnchor) return;
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
  function chooseMenu(destination: MenuDestination) {
    const opener = menuRef.current;
    setMenuAnchor(null);
    if (destination === "menu") home();
    else open(destination, opener);
  }
  const header =
    screen === "menu" || screen === "battle" ? null : (
      <ScreenHeader
        title={t(screen === "cards" ? "collection" : "options")}
        headingId={screen === "cards" ? "cards-title" : "options-title"}
        headingRef={headingRef}
        onBack={back}
        menuRef={menuRef}
        menuId={`toolbar-menu-${screen}`}
        menuOpen={menuAnchor !== null}
        onMenu={() => {
          const rect = menuRef.current?.getBoundingClientRect();
          if (rect) setMenuAnchor(rect);
        }}
      />
    );

  return (
    <ScreenShell className="shell">
      <Background
        pair={hovered?.pair ?? null}
        reducedMotion={settings.reducedMotion}
        glow={settings.backgroundGlow}
        particles={settings.backgroundParticles}
      />
      {screen === "menu" ? (
        <section className="intro" aria-labelledby="title">
          <h1 id="title">{t("title")}</h1>
          <div className="menu-actions">
            <MenuAction
              id="menu-play"
              icon="play"
              label={t("play")}
              primary
              onClick={() => open("battle")}
              color={PLAY_COLOR}
              onHighlight={onHighlight}
            />
            <MenuAction
              id="menu-collection"
              icon="collection"
              label={t("collection")}
              color={COLLECTION_COLOR}
              onHighlight={onHighlight}
              onClick={() => open("cards")}
            />
            <div className={desktop ? "menu-bottom menu-bottom--desktop" : "menu-bottom"}>
              {desktop && (
                <MenuAction
                  id="menu-quit"
                  icon="quit"
                  label={t("quit")}
                  color={null}
                  onHighlight={onHighlight}
                  onClick={() => {
                    void desktop.quit().catch(() => undefined);
                  }}
                />
              )}
              <MenuAction
                id="menu-options"
                icon="options"
                label={t("options")}
                color={OPTIONS_COLOR}
                onHighlight={onHighlight}
                onClick={() => open("options")}
              />
            </div>
          </div>
        </section>
      ) : screen === "battle" ? (
        <Battle onExit={home} onDiscover={onDiscover} />
      ) : screen === "cards" ? (
        <section
          className={`cards-screen${collectionView.kind === "enemies" ? " cards-screen--enemy" : ""}`}
          aria-labelledby="cards-title"
        >
          <CardBrowser
            header={header}
            catalog={realCatalog}
            discoveredIds={discoveries}
            view={collectionView}
            setView={setCollectionView}
            onInspectChange={onInspectChange}
          />
        </section>
      ) : (
        <section className="options-screen" aria-labelledby="options-title">
          {header}
          <TabBar
            label={t("options")}
            tabs={[
              { id: "display", label: t("display") },
              { id: "sound", label: t("soundTab") },
            ]}
            activeTab={optionsTab}
            onSelectTab={setOptionsTab}
          />
          <div className="options-panel">
            {optionsTab === "sound" ? (
              <>
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
              </>
            ) : (
              <>
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
                        onChange={(event) =>
                          updateSettings({ ...settings, [field]: Number(event.target.value) })
                        }
                      />
                      <output>{settings[field]}%</output>
                    </span>
                  </label>
                ))}
              </>
            )}
            {saveFailed && (
              <p className="save-error" role="status">
                {t("settingsSaveError")}
              </p>
            )}
          </div>
        </section>
      )}
      {menuAnchor && screen !== "menu" && screen !== "battle" && (
        <GameMenu
          current={screen}
          anchor={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          onSelect={chooseMenu}
        />
      )}
    </ScreenShell>
  );
}
