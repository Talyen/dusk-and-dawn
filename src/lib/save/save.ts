import { z } from "zod";
import type { Snapshot } from "../game/session";

const envelopeSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    random: z.number().int().min(0).max(0xffffffff),
    state: z.json(),
  })
  .strict();
export type SaveEnvelope = z.infer<typeof envelopeSchema>;
export interface SaveBackend {
  readCandidates(): Promise<string[]>;
  write(data: string, options?: { preserveBackup?: boolean }): Promise<void>;
}
export interface DesktopSaveBridge {
  readSaveCandidates(): Promise<string[]>;
  writeSave(data: string, preserveBackup?: boolean): Promise<void>;
}
export function desktopSaveBackend(bridge: DesktopSaveBridge): SaveBackend {
  return {
    readCandidates: () => bridge.readSaveCandidates(),
    write: (data, options) => bridge.writeSave(data, options?.preserveBackup ?? false),
  };
}
export async function readSave(backend: SaveBackend): Promise<SaveEnvelope | null> {
  const candidates = await backend.readCandidates();
  if (candidates.length === 0) return null;
  for (const candidate of candidates) {
    try {
      return decodeSave(candidate);
    } catch {
      /* Try the next retained copy. */
    }
  }
  throw new Error("No valid save candidate");
}
export function encodeSave(value: SaveEnvelope): string {
  return JSON.stringify(envelopeSchema.parse(value));
}
export function decodeSave(data: string): SaveEnvelope {
  return envelopeSchema.parse(JSON.parse(data));
}
export function browserSaveBackend(storage: Storage, key = "dusk-and-dawn.save.v1"): SaveBackend {
  return {
    readCandidates: async () =>
      [storage.getItem(key), storage.getItem(`${key}.backup`)].filter(
        (value): value is string => value !== null,
      ),
    write: async (data, options) => {
      decodeSave(data);
      const old = storage.getItem(key);
      if (old !== null && !options?.preserveBackup) {
        let valid = true;
        try {
          decodeSave(old);
        } catch {
          valid = false;
        }
        if (valid) storage.setItem(`${key}.backup`, old);
      }
      storage.setItem(key, data);
    },
  };
}

export function snapshotToSave<S>(snapshot: Snapshot<S>): SaveEnvelope {
  return envelopeSchema.parse({
    version: 1,
    revision: snapshot.revision,
    random: snapshot.random.value,
    state: snapshot.state,
  });
}
export function snapshotFromSave<S>(save: SaveEnvelope, stateSchema: z.ZodType<S>): Snapshot<S> {
  const value = envelopeSchema.parse(save);
  return { revision: value.revision, random: { value: value.random }, state: stateSchema.parse(value.state) };
}
