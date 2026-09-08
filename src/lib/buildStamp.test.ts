import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GitLab Pages build stamp", () => {
  it("stamps the HTML template at the top", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html.startsWith("<!doctype html>\n<!-- GitLab Pages build %GITLAB_PAGES_BUILD% -->")).toBe(true);
    expect(html).toContain('id="build-stamp"');
    expect(html).toContain("%PAGES_STAMP%");
  });
});
