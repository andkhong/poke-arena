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
