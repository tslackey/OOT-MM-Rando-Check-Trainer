/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function gitlabPagesBuildStamp(): Plugin {
  const build =
    process.env.CI_PIPELINE_IID ||
    process.env.GITLAB_PAGES_BUILD ||
    process.env.GITHUB_RUN_NUMBER ||
    "local";
  return {
    name: "gitlab-pages-build-stamp",
    transformIndexHtml(html) {
      return html.replaceAll("%GITLAB_PAGES_BUILD%", build);
    },
  };
}

export default defineConfig({
  plugins: [react(), gitlabPagesBuildStamp()],
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
