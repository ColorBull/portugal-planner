import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Relative base + HashRouter → works from any GitHub Pages sub-path
// (https://<user>.github.io/portugal-planner/) with no extra config.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // public/sw.js reads this list to store every file of the build offline.
  build: { manifest: "asset-manifest.json" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
