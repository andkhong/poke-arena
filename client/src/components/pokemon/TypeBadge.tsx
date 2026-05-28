import { TYPE_COLORS } from "../../styles/typeColors";

export function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "#888";
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-bold text-white uppercase"
      style={{ backgroundColor: color }}
    >
      {type}
    </span>
  );
}
