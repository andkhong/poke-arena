import { useEffect, useState } from "react";

interface Props {
  onCancel: () => void;
  isBotMatch?: boolean;
}

export function MatchmakingModal({ onCancel, isBotMatch }: Props) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-[#3a3a6a] rounded-xl p-8 text-center space-y-4 w-80">
        <div className="text-4xl">{isBotMatch ? "🤖" : "⚔"}</div>
        <h2 className="text-white text-xl font-bold">
          {isBotMatch ? `Starting bot match${dots}` : `Finding opponents${dots}`}
        </h2>
        <p className="text-gray-400 text-sm">
          {isBotMatch
            ? "Preparing your CPU opponent"
            : "Waiting for other trainers to join the arena"}
        </p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-yellow-400"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 text-sm hover:text-white transition mt-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
