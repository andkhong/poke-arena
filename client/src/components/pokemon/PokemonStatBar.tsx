interface Props {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export function PokemonStatBar({ label, value, max = 255, color = "#4466ff" }: Props) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 text-right text-gray-400 text-xs">{label}</span>
      <span className="w-8 text-right font-mono text-white text-xs">{value}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
