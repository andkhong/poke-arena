import { apiClient } from "./client";
import type { UserPublic } from "@poke-arena/shared";

interface AuthResponse {
  token: string;
  user: UserPublic;
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", {
    username, email, password,
  });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<UserPublic> {
  const { data } = await apiClient.get<UserPublic>("/auth/me");
  return data;
}
