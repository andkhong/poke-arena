import { TypeBadge } from "./TypeBadge";
import type { PokemonSummary } from "@poke-arena/shared";

interface Props {
  pokemon: PokemonSummary;
  selected?: boolean;
  onClick?: () => void;
}

export function PokemonCard({ pokemon, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1a1a2e] border rounded-lg p-3 cursor-pointer transition-all hover:scale-105 ${
        selected
          ? "border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]"
          : "border-gray-700 hover:border-gray-500"
      }`}
    >
      <div className="flex justify-center h-16 items-end">
        <img
          src={pokemon.spriteUrl}
          alt={pokemon.displayName}
          className="max-h-full object-contain pixelated"
          style={{ imageRendering: "pixelated" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
          }}
        />
      </div>
      <p className="text-white text-xs text-center font-bold mt-1 truncate">{pokemon.displayName}</p>
      <p className="text-gray-500 text-xs text-center">#{String(pokemon.id).padStart(3, "0")}</p>
      <div className="flex gap-1 justify-center mt-1 flex-wrap">
        {pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
      </div>
    </div>
  );
}
