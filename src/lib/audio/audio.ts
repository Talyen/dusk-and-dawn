export type AudioChannel = "music" | "sound";
export interface AudioPlayer {
  volume: number;
  loop: boolean;
  play(): Promise<void>;
  pause(): void;
  addEventListener?(type: "ended", listener: () => void, options?: { once: boolean }): void;
}
export function createAudioManager(createPlayer: (url: string) => AudioPlayer = (url) => new Audio(url)) {
  const volumes: Record<AudioChannel, number> = { music: 1, sound: 1 };
  const active = new Map<AudioPlayer, AudioChannel>();
  function setVolume(channel: AudioChannel, volume: number) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1)
      throw new Error("Volume must be between 0 and 1");
    volumes[channel] = volume;
    for (const [player, playerChannel] of active) if (playerChannel === channel) player.volume = volume;
  }
  async function play(url: string, channel: AudioChannel, loop = false): Promise<AudioPlayer | null> {
    const player = createPlayer(url);
    player.volume = volumes[channel];
    player.loop = loop;
    active.set(player, channel);
    if (!loop) player.addEventListener?.("ended", () => active.delete(player), { once: true });
    try {
      await player.play();
      return player;
    } catch {
      active.delete(player);
      return null;
    }
  }
  function stop(player: AudioPlayer) {
    player.pause();
    active.delete(player);
  }
  function dispose() {
    for (const player of active.keys()) player.pause();
    active.clear();
  }
  return { play, stop, setVolume, dispose };
}
