import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sample from "./fixtures/ootr-spoiler-sample.json";
import { exportRandoFile, ImportError, importRandoFile, mapItem, matchLocation, parseRandoJson } from "./importRando";

describe("OoTR JSON import", () => {
  it("maps closed forest, open door, adult start, and shuffle flags", () => {
    const result = importRandoFile(JSON.stringify(sample), "00-18-88-65-24_0724.json");
    expect(result.config.games).toEqual({ oot: true, mm: false });
    expect(result.config.openForest).toBe(false);
    expect(result.config.openDoorOfTime).toBe(true);
    expect(result.config.startingAge).toBe("adult");
    expect(result.config.spawnShuffle).toBe(true);
    expect(result.config.childSpawn).toBe("oot-lh");
    expect(result.config.adultSpawn).toBe("oot-kak");
    expect(result.config.spawn).toBe("oot-kak");
    expect(result.config.checkTypes.shop).toBe(true);
    expect(result.config.checkTypes.scrub).toBe(false);
    expect(result.config.checkTypes.skullReward).toBe(true);
    expect(result.config.checkTypes.trade).toBe(false);
    expect(result.config.randoSettings?.["Closed Forest"]).toBe("On");
    expect(result.config.randoSeed).toBe("6951318300");
    expect(result.config.startingItems).not.toContain("ocarina");
  });

  it("matches spoiler locations onto trainer checks and placements", () => {
    const result = importRandoFile(JSON.stringify(sample), "spoiler.json");
    expect(matchLocation("KF Kokiri Sword Chest")).toBe("oot-kokiri-forest-kokiri-sword-chest");
    expect(result.config.importedPlacement?.["oot-kokiri-forest-kokiri-sword-chest"]).toBe("piece_of_heart");
    expect(result.config.importedPlacement?.["oot-zelda-s-song"]).toBe("ocarina");
    expect(result.config.importedPlacement?.["oot-deku-tree-boss"]).toBe("kokiri_emerald");
    expect(result.matchedLocations).toBeGreaterThanOrEqual(8);
    expect(result.config.importedCheckIds).toContain("oot-lost-woods-target");
  });

  it("maps dungeon small keys onto stackable trainer ids", () => {
    expect(mapItem("Small Key (Forest Temple)")).toBe("small_key_forest");
    expect(mapItem("Boss Key (Fire Temple)")).toBe("boss_key_fire");
    expect(matchLocation("Forest Temple Map Chest")).toBe("oot-forest-temple-map");
    expect(matchLocation("Fire Temple Megaton Hammer Chest")).toBe("oot-fire-temple-hammer");
  });

  it("round-trips trainer fields through export JSON", () => {
    const imported = importRandoFile(JSON.stringify(sample), "spoiler.json");
    imported.config.penaltySeconds = 20;
    const exported = exportRandoFile(imported.config);
    const again = importRandoFile(exported, "export.json");
    expect(again.config.penaltySeconds).toBe(20);
    expect(again.config.randoSettings?.["Door of Time"]).toBe("Open");
    expect(again.config.openForest).toBe(false);
    expect(again.config.childSpawn).toBe("oot-lh");
    expect(again.config.adultSpawn).toBe("oot-kak");
    expect(again.config.spawnShuffle).toBe(true);
    imported.config.eitherAgeLogic = true;
    const withEither = importRandoFile(exportRandoFile(imported.config), "export.json");
    expect(withEither.config.eitherAgeLogic).toBe(true);
  });

  it("accepts a raw settings object", () => {
    const result = importRandoFile(JSON.stringify(sample.settings), "settings.json");
    expect(result.totalLocations).toBe(0);
    expect(result.config.openForest).toBe(false);
    expect(result.config.importSummary).toMatch(/settings only/i);
  });

  it("rejects junk JSON", () => {
    expect(() => parseRandoJson("{")).toThrow(ImportError);
    expect(() => importRandoFile("[]", "x.json")).toThrow(/array/i);
  });

  it("imports the uploaded spoiler when present", () => {
    let raw: string;
    try {
      raw = readFileSync(
        "/home/ubuntu/.cursor/projects/workspace/uploads/00-18-88-65-24_0724.json",
        "utf8",
      );
    } catch {
      return;
    }
    const result = importRandoFile(raw, "00-18-88-65-24_0724.json");
    expect(result.config.randoSettings?.["Logic"]).toBe("Glitchless");
    expect(result.totalLocations).toBeGreaterThan(100);
    expect(result.matchedLocations).toBeGreaterThan(40);
  });
});
