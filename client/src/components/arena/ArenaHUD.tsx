import { useArenaStore } from "../../store/arenaStore";
import { useAuthStore } from "../../store/authStore";

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function ArenaHUD() {
  const { players, timeRemaining, eliminations } = useArenaStore();
  const { user } = useAuthStore();
  const alive = players.filter((p) => p.pokemon.isAlive).length;
  const me = players.find((p) => p.userId === user?.id);

  const timeColor =
    timeRemaining > 60000 ? "text-green-400" :
    timeRemaining > 30000 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/70">
        <div className="text-gray-300 text-sm font-bold">
          {alive} / {players.length} remaining
        </div>
        <div className={`text-2xl font-mono font-bold ${timeColor}`}>
          {formatTime(timeRemaining)}
        </div>
        {me && (
          <div className="text-sm text-gray-300">
            <span className="text-yellow-400 font-bold">{me.pokemon.displayName}</span>
            {" "}
            <span
              className={
                me.pokemon.currentHp / me.pokemon.maxHp > 0.5
                  ? "text-green-400"
                  : me.pokemon.currentHp / me.pokemon.maxHp > 0.25
                  ? "text-yellow-400"
                  : "text-red-400"
              }
            >
              {me.pokemon.currentHp}/{me.pokemon.maxHp} HP
            </span>
          </div>
        )}
      </div>

      {/* Elimination feed */}
      <div className="absolute top-12 right-4 space-y-1">
        {eliminations.slice(-5).reverse().map((e, i) => (
          <div key={i} className="bg-black/70 text-xs text-gray-300 px-2 py-1 rounded animate-fade-in">
            <span className="text-red-400 font-bold">KO</span> {e.username} — #{e.placement}
          </div>
        ))}
      </div>
    </div>
  );
}
