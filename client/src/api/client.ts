import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("pa_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
