import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import sample from "./fixtures/ootr-spoiler-sample.json";
import { importRandoFile } from "./importRando";
import { matchSpawnDestination } from "./spawns";
import { generateSpoiler, startingRegion } from "./spoiler";

describe("spoiler generation and spawns", () => {
  it("maps OoTR spawn destinations onto overworld regions", () => {
    expect(matchSpawnDestination("Lake Hylia North Exit")).toBe("oot-lh");
    expect(matchSpawnDestination("Kak Impas House")).toBe("oot-kak");
    expect(matchSpawnDestination("KF Links House")).toBe("oot-kokiri");
    expect(matchSpawnDestination("Temple of Time")).toBe("oot-tot");
  });

  it("does not always start shuffled seeds in Kokiri", () => {
    const config = createConfig({ spawnShuffle: true, startingAge: "child" });
    const starts = new Set(
      Array.from({ length: 24 }, (_, seed) => startingRegion(generateSpoiler(config, seed + 1))),
    );
    expect(starts.size).toBeGreaterThan(1);
    expect([...starts].every((region) => region.startsWith("oot-"))).toBe(true);
  });

  it("keeps vanilla child/adult warps when spawn shuffle is off", () => {
    const spoiler = generateSpoiler(createConfig({ startingAge: "child" }), 9);
    expect(spoiler.childSpawnId).toBe("oot-kokiri");
    expect(spoiler.adultSpawnId).toBe("oot-tot");
    expect(startingRegion(spoiler)).toBe("oot-kokiri");
  });

  it("builds a spoiler log from a config, including locations and spawns", () => {
    const spoiler = generateSpoiler(createConfig({ startingAge: "adult", spawnShuffle: true }), 42);
    expect(spoiler.startingAge).toBe("adult");
    expect(Object.keys(spoiler.locations).length).toBeGreaterThan(10);
    expect(spoiler.entrances["Child Spawn"]).toBeTruthy();
    expect(spoiler.entrances["Adult Spawn"]).toBeTruthy();
    expect(spoiler.placement).toEqual(generateSpoiler(createConfig({ startingAge: "adult", spawnShuffle: true }), 42).placement);
  });

  it("uses imported spoiler spawn points instead of Kokiri", () => {
    const imported = importRandoFile(JSON.stringify(sample), "spoiler.json");
    const spoiler = generateSpoiler(imported.config, 1);
    expect(spoiler.startingAge).toBe("adult");
    expect(spoiler.adultSpawnId).toBe("oot-kak");
    expect(spoiler.childSpawnId).toBe("oot-lh");
    expect(startingRegion(spoiler)).toBe("oot-kak");
  });
});
