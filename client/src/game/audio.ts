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

// Per-type move sound effects (synthesized WAVs in client/public/movesfx/).
// Status moves share one sound; everything else plays its move type's sound.
export function playMoveSound(moveType: string, damageClass: string, volume = 0.3): void {
  try {
    const name = damageClass === "status" ? "status" : moveType;
    const audio = new Audio(`/movesfx/${name}.wav`);
    audio.volume = volume;
    void audio.play().catch(() => { /* ignored if blocked / missing */ });
  } catch {
    /* ignore */
  }
}
