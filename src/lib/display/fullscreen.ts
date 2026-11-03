interface DesktopDisplay {
  getFullscreen(): Promise<boolean>;
  setFullscreen(enabled: boolean): Promise<boolean>;
  onFullscreenChange(listener: (enabled: boolean) => void): () => void;
}

function desktopDisplay(): DesktopDisplay | undefined {
  return (window as unknown as { duskDesktop?: DesktopDisplay }).duskDesktop;
}

export async function getFullscreen() {
  const desktop = desktopDisplay();
  return desktop ? desktop.getFullscreen() : Boolean(document.fullscreenElement);
}

export async function setFullscreen(enabled: boolean) {
  const desktop = desktopDisplay();
  if (desktop) return desktop.setFullscreen(enabled);
  if (enabled && !document.fullscreenElement) await document.documentElement.requestFullscreen();
  if (!enabled && document.fullscreenElement) await document.exitFullscreen();
  return Boolean(document.fullscreenElement);
}

export function observeFullscreen(listener: (enabled: boolean) => void) {
  const desktop = desktopDisplay();
  if (desktop) return desktop.onFullscreenChange(listener);
  const update = () => listener(Boolean(document.fullscreenElement));
  document.addEventListener("fullscreenchange", update);
  return () => document.removeEventListener("fullscreenchange", update);
}
