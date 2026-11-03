const key = "dusk-and-dawn.expeditions.v1";
export interface Progression {
  completed: string[];
}
export function readProgression(storage: Storage | null): Progression {
  try {
    const value: unknown = JSON.parse(storage?.getItem(key) ?? "null");
    if (value && typeof value === "object" && "completed" in value && Array.isArray(value.completed))
      return {
        completed: [
          ...new Set(
            value.completed.filter((id): id is string => typeof id === "string" && id.length <= 128),
          ),
        ].slice(-1000),
      };
  } catch {
    /* A damaged progression record does not prevent a run. */
  }
  return { completed: [] };
}
export function recordExpedition(storage: Storage | null, id: string): Progression {
  const progress = readProgression(storage);
  if (!progress.completed.includes(id)) progress.completed.push(id);
  try {
    storage?.setItem(key, JSON.stringify(progress));
  } catch {
    /* Play remains available without storage. */
  }
  return progress;
}
export function unlockTier(progress: Progression): number {
  return Math.min(3, 1 + progress.completed.length);
}
