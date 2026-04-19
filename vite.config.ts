import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxy = {
  "/api/runelite": {
    target: "https://sync.runescape.wiki",
    changeOrigin: true,
    rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ""),
    headers: {
      "User-Agent": "osrs-leagues-task-compare/0.1",
    },
  },
  "/api/completion-rates": {
    target: "https://oldschool.runescape.wiki",
    changeOrigin: true,
    rewrite: () =>
      "/?title=Module:Demonic_Pacts_League/Tasks/completion.json&action=raw&ctype=application%2Fjson",
    headers: {
      "User-Agent": "osrs-leagues-task-compare/0.1",
    },
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy,
  },
  preview: {
    proxy,
  },
});
