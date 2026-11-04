const key = "dusk-and-dawn.expeditions.v1";
export interface Progression {
  completed: string[];
}

/** Distinguish an absent record from an unreadable or malformed one. */
function readStoredProgression(storage: Storage | null): Progression | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { completed: [] };
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && "completed" in value && Array.isArray(value.completed))
      return {
        completed: [
          ...new Set(
            value.completed.filter((id): id is string => typeof id === "string" && id.length <= 128),
          ),
        ].slice(-1000),
      };
  } catch {
    /* An unreadable record must not be replaced by an empty one. */
  }
  return null;
}

export function readProgression(storage: Storage | null): Progression {
  return readStoredProgression(storage) ?? { completed: [] };
}
export function recordExpedition(storage: Storage | null, id: string): Progression {
  const progress = readStoredProgression(storage);
  if (!storage || !progress) return { completed: [] };
  if (progress.completed.includes(id)) return progress;
  const updated = { completed: [...progress.completed, id] };
  try {
    storage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    /* Play remains available without claiming an unsaved unlock. */
    return progress;
  }
}
export function unlockTier(progress: Progression): number {
  return Math.min(3, 1 + progress.completed.length);
}
