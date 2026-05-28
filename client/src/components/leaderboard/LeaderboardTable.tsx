import { useLeaderboard } from "../../hooks/usePokemonQuery";

export function LeaderboardTable() {
  const { data, isLoading } = useLeaderboard();

  if (isLoading) {
    return (
      <div className="text-gray-400 text-sm text-center py-8">
        Loading leaderboard...
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No battles yet. Be the first to compete!
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1a1a2e] text-gray-400 text-xs uppercase">
            <th className="py-2 px-4 text-left">Rank</th>
            <th className="py-2 px-4 text-left">Trainer</th>
            <th className="py-2 px-4 text-right">Wins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, i) => (
            <tr
              key={entry.userId}
              className={`border-t border-gray-800 ${
                i === 0 ? "bg-yellow-400/5" : "bg-[#0f0f1a]"
              } hover:bg-white/5 transition`}
            >
              <td className="py-2 px-4 text-gray-400">
                {medals[i] ?? `#${entry.rank}`}
              </td>
              <td className="py-2 px-4 text-white font-medium">{entry.username}</td>
              <td className="py-2 px-4 text-right text-green-400 font-bold">{entry.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
