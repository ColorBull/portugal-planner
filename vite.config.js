import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// When this build was made, as 2026-10-05_14:32 in Jerusalem time (the family's
// clock, whatever the build server's zone): shown at the foot of the settings
// dialog so anyone can tell whether the app is the latest version.
const parts = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .map((p) => [p.type, p.value])
);
const BUILD_TIME = `${parts.year}-${parts.month}-${parts.day}_${parts.hour}:${parts.minute}`;

// Relative base + HashRouter → works from any GitHub Pages sub-path
// (https://<user>.github.io/portugal-planner/) with no extra config.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { __BUILD_TIME__: JSON.stringify(BUILD_TIME) },
  // public/sw.js reads this list to store every file of the build offline.
  build: { manifest: "asset-manifest.json" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
