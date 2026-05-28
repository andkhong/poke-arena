import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./components/layout/Navbar";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PokemonSelectPage } from "./pages/PokemonSelectPage";
import { ArenaPage } from "./pages/ArenaPage";
import { useArenaSocket } from "./hooks/useArenaSocket";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function AppRoutes() {
  useArenaSocket();
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/select"
          element={<ProtectedRoute><PokemonSelectPage /></ProtectedRoute>}
        />
        <Route
          path="/arena"
          element={<ProtectedRoute><ArenaPage /></ProtectedRoute>}
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
