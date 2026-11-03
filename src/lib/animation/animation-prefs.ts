let query: MediaQueryList | undefined;
let queryWindow: Window | undefined;

export function shouldReduceMotion(): boolean {
  if (document.documentElement.dataset.reducedMotion === "true") return true;
  if (typeof window.matchMedia !== "function") return false;
  if (!query || queryWindow !== window) {
    query = window.matchMedia("(prefers-reduced-motion: reduce)");
    queryWindow = window;
  }
  return query.matches;
}
