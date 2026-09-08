import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import {
  ageOk,
  canUseConnection,
  CHECK_BY_ID,
  enabledChecks,
  flagsFor,
  hasAll,
  isMajoraItem,
  reachableRegionIds,
  REGION_BY_ID,
  spawnRegion,
  WORLD,
} from "./world";

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

  it("starts child in Kokiri and adult in Temple of Time", () => {
    expect(spawnRegion(createConfig({ startingAge: "child" }))).toBe("oot-kokiri");
    expect(spawnRegion(createConfig({ startingAge: "adult" }))).toBe("oot-tot");
  });

  it("injects open-world flags without cross-game", () => {
    const flags = flagsFor(
      createConfig({ openForest: true, openDeku: false, openZora: true }),
    );
    expect(flags).toContain("open_forest");
    expect(flags).not.toContain("open_deku");
    expect(flags).not.toContain("cross_game");
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

  it("walks reachable OoT regions from spawn with open flags", () => {
    const inventory = ["open_forest", "open_deku", "open_zora", "ocarina", "song_of_time"];
    const reachable = reachableRegionIds("oot-kokiri", inventory, "child");
    expect(reachable.has("oot-lost-woods")).toBe(true);
    expect(reachable.has("oot-deku-theater")).toBe(true);
    expect(reachable.has("oot-field")).toBe(true);
    expect(reachable.has("mm-sct")).toBe(false);
    expect(reachable.has("oot-forest")).toBe(false);
  });

  it("treats any-age checks as always age-ok", () => {
    expect(ageOk("any", "child")).toBe(true);
    expect(ageOk("adult", "child")).toBe(false);
    expect(hasAll(["bow", "hookshot"], ["bow"])).toBe(true);
    expect(hasAll(["bow"], ["bow", "hookshot"])).toBe(false);
  });

  it("places Deku Theater next to Lost Woods with the mask checks", () => {
    const sticks = CHECK_BY_ID["oot-deku-theater-sticks-upgrade"];
    const nuts = CHECK_BY_ID["oot-deku-theater-nuts-upgrade"];
    expect(sticks.regionId).toBe("oot-deku-theater");
    expect(nuts.regionId).toBe("oot-deku-theater");
    expect(sticks.age).toBe("child");
    expect(nuts.age).toBe("child");
    expect(sticks.name).toBe("Deku Theater Skull Mask");
    expect(nuts.name).toBe("Deku Theater Mask of Truth");
    expect(REGION_BY_ID["oot-deku-theater"].name).toBe("Deku Theater");
  });

  it("drops Majora's Mask regions, checks, and items", () => {
    expect(WORLD.regions.every((region) => region.game === "oot")).toBe(true);
    expect(WORLD.checks.every((check) => check.game === "oot")).toBe(true);
    expect(WORLD.itemPool.progression.some(isMajoraItem)).toBe(false);
    expect(WORLD.checks.some((check) => check.id.startsWith("mm-"))).toBe(false);
    expect(REGION_BY_ID["mm-sct"]).toBeUndefined();
  });
});
