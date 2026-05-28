import { PokemonStatBar } from "./PokemonStatBar";
import type { PokemonSummary } from "@poke-arena/shared";

const STAT_CONFIGS = [
  { key: "hp",         label: "HP",      color: "#ff5555" },
  { key: "attack",     label: "Atk",     color: "#ff8800" },
  { key: "defense",    label: "Def",     color: "#ffcc00" },
  { key: "specialAtk", label: "Sp.Atk",  color: "#6688ff" },
  { key: "specialDef", label: "Sp.Def",  color: "#88aaff" },
  { key: "speed",      label: "Speed",   color: "#ff66aa" },
] as const;

export function PokemonStatPanel({ pokemon }: { pokemon: PokemonSummary }) {
  const stats = pokemon.stats;
  if (!stats) return null;
  return (
    <div className="space-y-1.5">
      {STAT_CONFIGS.map(({ key, label, color }) => (
        <PokemonStatBar
          key={key}
          label={label}
          value={stats[key as keyof typeof stats] ?? 0}
          color={color}
        />
      ))}
    </div>
  );
}
