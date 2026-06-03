// Pokemon cry playback. Files live in client/public/cries/{id}.ogg (downloaded from PokeAPI).
// Autoplay is permitted because the player clicked to start the match (a user gesture).
export function playCry(pokemonId: number, volume = 0.45): void {
  try {
    const audio = new Audio(`/cries/${pokemonId}.ogg`);
    audio.volume = volume;
    void audio.play().catch(() => { /* ignored if the browser blocks autoplay */ });
  } catch {
    /* ignore */
  }
}

// Pokeball drop/throw sound, played as each ball falls during the summon intro.
export function playPokeballDrop(volume = 0.4): void {
  try {
    const audio = new Audio(`/movesfx/pokeball-drop.wav`);
    audio.volume = volume;
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
function playTypeSound(moveType: string, damageClass: string, volume: number): void {
  const name = damageClass === "status" ? "status" : moveType;
  const audio = new Audio(`/movesfx/${name}.mp3`);
  audio.volume = volume;
  void audio.play().catch(() => { /* ignored if blocked / missing */ });
}

export function playMoveSound(
  sfx: string | null,
  moveType: string,
  damageClass: string,
  volume = 0.3,
): void {
  try {
    if (!sfx) {
      playTypeSound(moveType, damageClass, volume);
      return;
    }
    const audio = new Audio(`/movesfx/moves/${sfx}.mp3`);
    audio.volume = volume;
    // If the per-move file is missing/blocked, fall back to the type sound.
    audio.onerror = () => playTypeSound(moveType, damageClass, volume);
    void audio.play().catch(() => { /* ignored if blocked */ });
  } catch {
    /* ignore */
  }
}
