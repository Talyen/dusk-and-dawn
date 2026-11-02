import { expect, it, vi } from "vitest";
import { createAudioManager } from "../../src/lib/audio/audio";

it("manages channels and tolerates playback rejection", async () => {
  const player = { volume: 0, loop: false, play: vi.fn().mockResolvedValue(undefined), pause: vi.fn() };
  const manager = createAudioManager(() => player);
  manager.setVolume("music", 0.3);
  expect(await manager.play("music.ogg", "music", true)).toBe(player);
  expect(player.volume).toBe(0.3);
  expect(player.loop).toBe(true);
  manager.setVolume("music", 0.5);
  expect(player.volume).toBe(0.5);
  manager.dispose();
  expect(player.pause).toHaveBeenCalledOnce();
  player.play.mockRejectedValueOnce(new Error("blocked"));
  expect(await manager.play("missing.ogg", "sound")).toBeNull();
});
