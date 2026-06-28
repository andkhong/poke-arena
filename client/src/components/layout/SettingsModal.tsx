import { useEffect } from "react";
import { useSettingsStore, type SoundChannel } from "../../store/settingsStore";
import { playCry, playMoveSound, playPokeballDrop } from "../../game/audio";

const MOVE_TYPES = [
  "bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying",
  "ghost", "grass", "ground", "ice", "normal", "poison", "psychic", "rock",
  "steel", "water",
];

function randomGen1Id(): number {
  return 1 + Math.floor(Math.random() * 151);
}
function randomType(): string {
  return MOVE_TYPES[Math.floor(Math.random() * MOVE_TYPES.length)];
}

// Channels in display order. `preview` plays a representative one-shot sound at
// the current settings so the user can hear the level they picked. Music has no
// one-shot preview — its slider updates the looping battle track live instead.
const CHANNELS: { key: SoundChannel; label: string; preview?: () => void }[] = [
  { key: "music", label: "Music" },
  { key: "cries", label: "Pokémon Cries", preview: () => playCry(randomGen1Id()) },
  { key: "moves", label: "Move Sounds", preview: () => playMoveSound(null, randomType(), "physical") },
  { key: "effects", label: "Effects (Poké Ball)", preview: () => playPokeballDrop() },
];

function VolumeRow({
  label,
  value,
  onChange,
  preview,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  preview?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-36 shrink-0 text-sm text-gray-200">{label}</label>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="flex-1 accent-yellow-400 cursor-pointer"
        aria-label={`${label} volume`}
      />
      <span className="w-10 text-right text-xs font-mono text-gray-400 tabular-nums">
        {Math.round(value * 100)}%
      </span>
      <button
        type="button"
        onClick={preview}
        disabled={!preview}
        title={preview ? `Test ${label}` : "Adjusts live during battle"}
        className="w-7 shrink-0 text-center text-gray-300 enabled:hover:text-yellow-400 disabled:opacity-25 transition"
      >
        🔊
      </button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { master, music, cries, moves, effects, setVolume, reset } = useSettingsStore();
  const values: Record<SoundChannel, number> = { master, music, cries, moves, effects };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-md rounded-lg bg-[#0d0d1a] border border-[#2a2a4a] shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-yellow-400 tracking-wide">⚙ Audio Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <VolumeRow
            label="Master Volume"
            value={values.master}
            onChange={(v) => setVolume("master", v)}
          />
          <div className="border-t border-[#2a2a4a] my-1" />
          {CHANNELS.map((c) => (
            <VolumeRow
              key={c.key}
              label={c.label}
              value={values[c.key]}
              onChange={(v) => setVolume(c.key, v)}
              preview={c.preview}
            />
          ))}
        </div>

        <div className="flex justify-between items-center mt-5">
          <button
            onClick={reset}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
