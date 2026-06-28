import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { logout } from "../../api/auth";
import { SettingsModal } from "./SettingsModal";

export function Navbar() {
  const { user, logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleLogout() {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    navigate("/login");
  }

  return (
    <>
    <nav className="flex items-center justify-between px-6 py-3 bg-[#0d0d1a] border-b border-[#2a2a4a]">
      <Link to="/" className="text-xl font-bold text-yellow-400 tracking-wider">
        ⚔ PokeArena
      </Link>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSettingsOpen(true)}
          title="Audio settings"
          aria-label="Audio settings"
          className="text-gray-400 hover:text-yellow-400 text-lg leading-none transition"
        >
          ⚙
        </button>
        {user ? (
          <>
            <span className="text-gray-300 text-sm">
              {user.username} · <span className="text-green-400">{user.wins}W</span>
              {" / "}
              <span className="text-red-400">{user.losses}L</span>
            </span>
            <Link to="/select" className="px-3 py-1 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300 transition">
              Play
            </Link>
            <button onClick={handleLogout} className="text-gray-400 text-sm hover:text-white transition">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-300 text-sm hover:text-white">Login</Link>
            <Link to="/register" className="px-3 py-1 bg-yellow-400 text-black text-sm font-bold rounded hover:bg-yellow-300">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
