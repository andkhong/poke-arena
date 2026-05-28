import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      loginStore(data.token, data.user);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-yellow-400">Sign In</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back, trainer</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#1a1a2e] border border-gray-700 rounded-xl p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-gray-400 text-xs mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-yellow-400 text-black font-bold rounded hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-gray-400 text-sm">
          No account?{" "}
          <Link to="/register" className="text-yellow-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
