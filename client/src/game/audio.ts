import { useSettingsStore } from "../store/settingsStore";

// Base volumes per channel — the game's default mix, tuned so the channels don't
// drown each other out. The user-facing sliders (settingsStore) are 0..1
// multipliers on top of these, plus a master multiplier. So 100% on a slider
// reproduces the values below; lowering it scales down from there.
const BASE = { cries: 0.45, effects: 0.4, moves: 0.3, music: 0.35 } as const;

function vol(channel: keyof typeof BASE): number {
  const s = useSettingsStore.getState();
  return BASE[channel] * s.master * s[channel];
}

// Pokemon cry playback. Files live in client/public/cries/{id}.ogg (downloaded from PokeAPI).
// Autoplay is permitted because the player clicked to start the match (a user gesture).
export function playCry(pokemonId: number): void {
  try {
    const audio = new Audio(`/cries/${pokemonId}.ogg`);
    audio.volume = vol("cries");
    void audio.play().catch(() => { /* ignored if the browser blocks autoplay */ });
  } catch {
    /* ignore */
  }
}

// Pokeball drop/throw sound, played as each ball falls during the summon intro.
export function playPokeballDrop(): void {
  try {
    const audio = new Audio(`/movesfx/pokeball-drop.wav`);
    audio.volume = vol("effects");
    void audio.play().catch(() => { /* ignored if blocked */ });
  } catch {
    /* ignore */
  }
}

// Move sound effects (real game SFX in client/public/movesfx/).
// Resolution order:
//   1. `sfx` set  → the move's own sound at /movesfx/moves/<sfx>.mp3 (per-move).
//   2. otherwise  → the per-type sound /movesfx/<type>.mp3 (status moves share status.mp3).
// `sfx` is only populated when the file exists (the DB seed mirrors the assets folder),
// but we still fall back on a load error as a safety net.
function playTypeSound(moveType: string, damageClass: string): void {
  const name = damageClass === "status" ? "status" : moveType;
  const audio = new Audio(`/movesfx/${name}.mp3`);
  audio.volume = vol("moves");
  void audio.play().catch(() => { /* ignored if blocked / missing */ });
}

export function playMoveSound(
  sfx: string | null,
  moveType: string,
  damageClass: string,
): void {
  try {
    if (!sfx) {
      playTypeSound(moveType, damageClass);
      return;
    }
    const audio = new Audio(`/movesfx/moves/${sfx}.mp3`);
    audio.volume = vol("moves");
    // If the per-move file is missing/blocked, fall back to the type sound.
    audio.onerror = () => playTypeSound(moveType, damageClass);
    void audio.play().catch(() => { /* ignored if blocked */ });
  } catch {
    /* ignore */
  }
}

// Background battle music. Files live in client/public/music/ (the Gen 1 OST,
// downloaded via scripts/fetch_battle_music.py); tracks.json lists their names.
// One random track loops per battle. `playToken` lets stopBattleMusic() always
// win over an in-flight (awaited) start, e.g. on unmount / StrictMode re-invoke.
let bgm: HTMLAudioElement | null = null;
let trackList: string[] | null = null;
let playToken = 0;

// Keep the currently-playing track's volume in sync when the user drags the
// music or master slider mid-battle.
useSettingsStore.subscribe((state) => {
  if (bgm) bgm.volume = BASE.music * state.master * state.music;
});

async function loadTracks(): Promise<string[]> {
  if (trackList) return trackList;
  try {
    const res = await fetch("/music/tracks.json");
    trackList = (await res.json()) as string[];
  } catch {
    trackList = [];
  }
  return trackList;
}

export async function playBattleMusic(): Promise<void> {
  const token = ++playToken; // claim this start
  const tracks = await loadTracks();
  if (token !== playToken) return; // a stop() or newer start happened during await
  if (tracks.length === 0) return;
  if (bgm) { bgm.pause(); bgm.currentTime = 0; } // replace any current track
  const file = tracks[Math.floor(Math.random() * tracks.length)];
  const audio = new Audio(`/music/${encodeURIComponent(file)}`);
  audio.loop = true;
  audio.volume = vol("music");
  bgm = audio;
  void audio.play().catch(() => { /* ignored if blocked */ });
}

export function stopBattleMusic(): void {
  playToken++; // invalidate any in-flight playBattleMusic
  if (bgm) { bgm.pause(); bgm.currentTime = 0; bgm = null; }
}
