import { describe, expect, it } from "vitest";
import { adjustedMs, checksPerMinute, completionRate, formatDuration, sessionElapsedMs } from "./scoring";

describe("scoring", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatDuration(75_000)).toBe("1:15");
    expect(formatDuration(3_661_000)).toBe("1:01:01");
  });

  it("excludes paused time", () => {
    const elapsed = sessionElapsedMs({
      startedAt: 1000,
      pausedMs: 200,
      finishedAt: 2000,
    });
    expect(elapsed).toBe(800);
  });

  it("adds penalty seconds onto adjusted time", () => {
    expect(adjustedMs(10_000, 15)).toBe(25_000);
  });

  it("computes pace and completion", () => {
    expect(checksPerMinute(12, 60_000)).toBe(12);
    expect(completionRate(5, 10)).toBe(0.5);
    expect(completionRate(1, 0)).toBe(0);
  });
});
