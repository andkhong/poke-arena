import { create } from "zustand";
import { persist } from "zustand/middleware";

// Per-channel audio volumes, each a 0..1 multiplier (1 = the game's default
// balance, 0 = muted). `master` scales every channel. audio.ts reads these via
// useSettingsStore.getState() and multiplies them into each sound's base volume.
export type SoundChannel = "master" | "music" | "cries" | "moves" | "effects";

interface SettingsState {
  master: number;
  music: number;
  cries: number;
  moves: number;
  effects: number;
  setVolume: (channel: SoundChannel, value: number) => void;
  reset: () => void;
}

const DEFAULTS = { master: 1, music: 1, cries: 1, moves: 1, effects: 1 };

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setVolume: (channel, value) =>
        set({ [channel]: Math.max(0, Math.min(1, value)) } as Partial<SettingsState>),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "pa-audio-settings",
      partialize: (s) => ({
        master: s.master,
        music: s.music,
        cries: s.cries,
        moves: s.moves,
        effects: s.effects,
      }),
    }
  )
);
