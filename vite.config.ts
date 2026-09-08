/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base works for Capacitor file:// and GitHub Pages project sites.
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
  },
});
