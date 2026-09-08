import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import {
  ageOk,
  canUseConnection,
  enabledChecks,
  flagsFor,
  hasAll,
  reachableRegionIds,
  spawnRegion,
} from "../data/world";

describe("world logic", () => {
  it("filters checks by game and type", () => {
    const oot = createConfig({
      games: { oot: true, mm: false },
      checkTypes: {
        chest: true,
        song: false,
        dungeonReward: false,
        scrub: false,
        shop: false,
        trade: false,
        skullReward: false,
      },
    });
    const checks = enabledChecks(oot);
    expect(checks.length).toBeGreaterThan(10);
    expect(checks.every((check) => check.game === "oot" && check.type === "chest")).toBe(true);
  });

  it("starts combined seeds in Kokiri", () => {
    expect(spawnRegion(createConfig({ games: { oot: true, mm: true } }))).toBe("oot-kokiri");
    expect(spawnRegion(createConfig({ games: { oot: false, mm: true } }))).toBe("mm-sct");
  });

  it("injects open-world flags", () => {
    const flags = flagsFor(
      createConfig({ openForest: true, openDeku: false, openZora: true, games: { oot: true, mm: true } }),
    );
    expect(flags).toContain("open_forest");
    expect(flags).not.toContain("open_deku");
    expect(flags).toContain("cross_game");
  });

  it("blocks connections that need items", () => {
    const locked = canUseConnection(
      { from: "oot-sfm", to: "oot-forest", needs: ["hookshot"], age: "adult" },
      ["open_forest"],
      "adult",
    );
    const open = canUseConnection(
      { from: "oot-sfm", to: "oot-forest", needs: ["hookshot"], age: "adult" },
      ["hookshot"],
      "adult",
    );
    expect(locked).toBe(false);
    expect(open).toBe(true);
  });

  it("walks reachable regions from spawn with open flags", () => {
    const inventory = ["open_forest", "open_deku", "open_zora", "cross_game", "ocarina", "song_of_time"];
    const reachable = reachableRegionIds("oot-kokiri", inventory, "child");
    expect(reachable.has("oot-lost-woods")).toBe(true);
    expect(reachable.has("oot-field")).toBe(true);
    expect(reachable.has("mm-sct")).toBe(true);
    expect(reachable.has("oot-forest")).toBe(false);
  });

  it("treats any-age checks as always age-ok", () => {
    expect(ageOk("any", "child")).toBe(true);
    expect(ageOk("adult", "child")).toBe(false);
    expect(hasAll(["bow", "hookshot"], ["bow"])).toBe(true);
    expect(hasAll(["bow"], ["bow", "hookshot"])).toBe(false);
  });
});
