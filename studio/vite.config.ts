import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PORT = Number(process.env.LS_DESIGN_PORT ?? 4177);

export default defineConfig({
  root: "app",
  plugins: [react()],
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
  },
  server: {
    port: 5177,
    proxy: {
      "/api": { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: false },
      "/files": { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: false },
    },
  },
});
