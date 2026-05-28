import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserPublic } from "@poke-arena/shared";
import { connectSocket, disconnectSocket } from "../socket";

interface AuthState {
  user: UserPublic | null;
  token: string | null;
  login: (token: string, user: UserPublic) => void;
  logout: () => void;
  updateRecord: (wins: number, losses: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: (token, user) => {
        localStorage.setItem("pa_token", token);
        connectSocket(token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem("pa_token");
        disconnectSocket();
        set({ token: null, user: null });
      },
      updateRecord: (wins, losses) => {
        const user = get().user;
        if (user) set({ user: { ...user, wins, losses } });
      },
    }),
    {
      name: "pa-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
