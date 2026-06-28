import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The shared package ships CommonJS (dist/index.js). Pre-bundle it so Vite's
  // dev server reliably exposes its runtime exports — without this, newly-added
  // named exports (constants) aren't surfaced and the app fails to load in dev.
  optimizeDeps: { include: ["@poke-arena/shared"] },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": { target: "http://localhost:3001", ws: true },
    },
  },
});
