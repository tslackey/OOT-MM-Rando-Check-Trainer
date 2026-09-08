import { describe, expect, it } from "vitest";
import type { ChangelogEntry } from "../data/changelog";
import { CHANGELOG } from "../data/changelog";
import { currentBuildInfo, formatBuildStamp, pullRequestUrl, stampChangelog } from "./buildInfo";

describe("changelog data", () => {
  it("lists newest first with a title and summary on every row", () => {
    expect(CHANGELOG.length).toBeGreaterThan(5);
    expect(CHANGELOG[0]?.pending).toBe(true);
    const prs = CHANGELOG.map((entry) => entry.pr).filter((pr): pr is number => typeof pr === "number");
    expect(new Set(prs).size).toBe(prs.length);
    for (const entry of CHANGELOG) {
      expect(entry.title.length).toBeGreaterThan(3);
      expect(entry.summary.length).toBeGreaterThan(12);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("build stamp helpers", () => {
  it("reads local build info when CI defines are unset", () => {
    expect(currentBuildInfo().build).toBe("local");
    expect(formatBuildStamp({ build: "42", pr: "13", sha: "abc1234" })).toBe("Pages build 42 · PR 13");
    expect(formatBuildStamp({ build: "40", pr: "", sha: "" })).toBe("Pages build 40");
    expect(pullRequestUrl(11)).toBe("https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/11");
  });

  it("stamps a pending row with the current Pages build", () => {
    const entries: ChangelogEntry[] = [
      { date: "2026-09-08", title: "New", summary: "Operator-facing changelog row.", pending: true },
      { date: "2026-09-08", title: "Old", summary: "Already shipped on main.", pr: 11, build: "40" },
    ];
    const stamped = stampChangelog(entries, { build: "45", pr: "", sha: "deadbee" });
    expect(stamped[0]).toMatchObject({ build: "45", current: true, pending: true });
    expect(stamped[1]).toMatchObject({ build: "40", current: false });
  });

  it("stamps the matching pull request on a preview build", () => {
    const entries: ChangelogEntry[] = [
      { date: "2026-09-08", title: "New", summary: "Operator-facing changelog row.", pr: 13 },
      { date: "2026-09-08", title: "Old", summary: "Already shipped on main.", pr: 11, build: "40" },
    ];
    const stamped = stampChangelog(entries, { build: "44", pr: "13", sha: "abcdef0" });
    expect(stamped[0]).toMatchObject({ build: "44", current: true, pr: 13 });
    expect(stamped[1]?.current).toBe(false);
  });
});
