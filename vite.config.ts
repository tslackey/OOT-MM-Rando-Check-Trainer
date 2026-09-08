/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function readPagesPr(): string {
  const explicit =
    process.env.PAGES_PR ||
    process.env.GITHUB_PR_NUMBER ||
    process.env.CI_MERGE_REQUEST_IID ||
    "";
  if (explicit) return explicit;
  const ref = process.env.GITHUB_REF || "";
  const fromRef = /^refs\/pull\/(\d+)\//.exec(ref);
  if (fromRef) return fromRef[1];
  const message = process.env.PAGES_COMMIT_MESSAGE || process.env.CI_COMMIT_MESSAGE || "";
  const fromMessage = /\(#(\d+)\)/.exec(message);
  return fromMessage?.[1] ?? "";
}

function gitlabPagesBuildStamp(): Plugin {
  const build =
    process.env.CI_PIPELINE_IID ||
    process.env.GITLAB_PAGES_BUILD ||
    process.env.GITHUB_RUN_NUMBER ||
    "local";
  const pr = readPagesPr();
  const sha = (process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || "").slice(0, 7);
  return {
    name: "gitlab-pages-build-stamp",
    config() {
      return {
        define: {
          __PAGES_BUILD__: JSON.stringify(build),
          __PAGES_PR__: JSON.stringify(pr),
          __PAGES_SHA__: JSON.stringify(sha),
        },
      };
    },
    transformIndexHtml(html) {
      const stamp = pr ? `Pages build ${build} · PR ${pr}` : `Pages build ${build}`;
      return html
        .replaceAll("%GITLAB_PAGES_BUILD%", build)
        .replaceAll("%PAGES_STAMP%", stamp)
        .replaceAll("%PAGES_PR%", pr || "none")
        .replaceAll("%PAGES_SHA%", sha || "local");
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
