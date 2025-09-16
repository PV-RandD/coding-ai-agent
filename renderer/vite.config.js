import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative paths so the packaged app can load assets via file://
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
