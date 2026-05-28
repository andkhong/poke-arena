const GENS = [1, 2, 3, 4, 5, 6, 7, 8];

interface Props {
  selected: number | null;
  onChange: (gen: number | null) => void;
}

export function GenerationFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-2 py-1 rounded text-xs font-bold transition ${
          selected === null
            ? "bg-yellow-400 text-black"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        All
      </button>
      {GENS.map((g) => (
        <button
          key={g}
          onClick={() => onChange(selected === g ? null : g)}
          className={`px-2 py-1 rounded text-xs font-bold transition ${
            selected === g
              ? "bg-yellow-400 text-black"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Gen {g}
        </button>
      ))}
    </div>
  );
}
