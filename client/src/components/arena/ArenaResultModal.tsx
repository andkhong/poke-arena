import { useNavigate } from "react-router-dom";
import { useArenaStore } from "../../store/arenaStore";
import { useMatchmakingStore } from "../../store/matchmakingStore";
import { useAuthStore } from "../../store/authStore";

export function ArenaResultModal() {
  const navigate = useNavigate();
  const { result, reset } = useArenaStore();
  const { setIdle } = useMatchmakingStore();
  const { user } = useAuthStore();

  if (!result) return null;

  const myRanking = result.rankings.find((r) => r.userId === user?.id);
  const isWinner = myRanking?.placement === 1;

  function handlePlayAgain() {
    reset();
    setIdle();
    navigate("/select");
  }

  function handleHome() {
    reset();
    setIdle();
    navigate("/");
  }

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-[#3a3a6a] rounded-xl p-8 w-96 text-center space-y-4 animate-fade-in">
        <div className="text-5xl">{isWinner ? "🏆" : "💀"}</div>
        <h2 className={`text-2xl font-bold ${isWinner ? "text-yellow-400" : "text-red-400"}`}>
          {isWinner ? "Victory!" : `Placed #${myRanking?.placement ?? "?"}`}
        </h2>

        <div className="space-y-1">
          {result.rankings.map((r) => (
            <div
              key={r.userId}
              className={`flex items-center justify-between px-3 py-1.5 rounded text-sm ${
                r.userId === user?.id ? "bg-yellow-400/10 border border-yellow-400/30" : "bg-gray-800"
              }`}
            >
              <span className="text-gray-400">#{r.placement}</span>
              <span className="text-white font-medium">{r.username}</span>
              <span className="text-gray-300">{r.pokemonName}</span>
              <span className="text-green-400">{r.hpPercent}% HP</span>
            </div>
          ))}
        </div>

        {result.myNewRecord ? (
          <p className="text-gray-400 text-sm">
            Record: <span className="text-green-400">{result.myNewRecord.wins}W</span>
            {" / "}
            <span className="text-red-400">{result.myNewRecord.losses}L</span>
          </p>
        ) : (
          <p className="text-gray-500 text-xs">Bot match — win/loss record not affected</p>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={handlePlayAgain} className="px-4 py-2 bg-yellow-400 text-black font-bold rounded hover:bg-yellow-300 transition">
            Play Again
          </button>
          <button onClick={handleHome} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition">
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
