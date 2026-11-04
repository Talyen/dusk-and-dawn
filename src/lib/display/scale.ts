import { useLayoutEffect } from "react";

/** Alchemy's 1280 × 720 fit and 72% large-window growth, normalized to this UI's authored units. */
export function getUiScale(width: number, height: number, gameSizePercent: number): number {
  const fit = Math.max(0, Math.min(width / 1280, height / 720));
  const density = fit <= 1 ? fit : 1 + (fit - 1) * 0.72;
  return density * (gameSizePercent / 100);
}

export function useUiScale(gameSizePercent: number) {
  useLayoutEffect(() => {
    const update = () => {
      document.documentElement.style.setProperty("--game-size-factor", String(gameSizePercent / 100));
      document.documentElement.style.setProperty(
        "--ui-scale",
        String(getUiScale(window.innerWidth, window.innerHeight, gameSizePercent)),
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [gameSizePercent]);
}
