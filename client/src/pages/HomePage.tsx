import { Link } from "react-router-dom";
import { LeaderboardTable } from "../components/leaderboard/LeaderboardTable";
import { useAuthStore } from "../store/authStore";

export function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-black text-yellow-400 tracking-tight">POKE ARENA</h1>
        <p className="text-gray-400 text-lg">
          Real-time Pokemon battle royale. Pick your fighter. Watch them clash.
        </p>
        {user ? (
          <Link
            to="/select"
            className="inline-block px-8 py-3 bg-yellow-400 text-black text-lg font-black rounded-lg hover:bg-yellow-300 transition hover:scale-105"
          >
            ⚔ Enter Arena
          </Link>
        ) : (
          <div className="flex gap-3 justify-center">
            <Link
              to="/register"
              className="px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-400 transition"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        {[
          { icon: "🎯", title: "Select", desc: "Choose any Pokemon from Gen 1–8" },
          { icon: "⚡", title: "Battle", desc: "Auto-battle royale — Speed determines attack rate" },
          { icon: "🏆", title: "Win", desc: "Last Pokemon standing climbs the leaderboard" },
        ].map((step) => (
          <div key={step.title} className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 space-y-1">
            <div className="text-2xl">{step.icon}</div>
            <div className="text-white font-bold">{step.title}</div>
            <div className="text-gray-400 text-xs">{step.desc}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        <h2 className="text-white text-lg font-bold">🏅 Leaderboard</h2>
        <LeaderboardTable />
      </div>
    </div>
  );
}
