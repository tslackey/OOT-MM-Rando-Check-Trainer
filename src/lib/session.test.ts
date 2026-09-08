import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { collectCheck, createSession, respawnToSpawn, setFaroresWind, travelTo, warpFaroresWind } from "./session";
import { CHECK_BY_ID, itemLabel, REGION_BY_ID } from "../data/world";

describe("practice session", () => {
  it("penalizes travel with no connecting path", () => {
    const config = createConfig({
      name: "test",
      games: { oot: true, mm: false },
      spawn: "oot-kokiri",
    });
    const session = createSession(config, 1);
    const next = travelTo(session, config, "oot-ganon");
    expect(next.penalties).toBe(1);
    expect(next.penaltySeconds).toBe(config.penaltySeconds);
    expect(next.currentRegionId).toBe("oot-kokiri");
    expect(next.log.at(-1)?.ok).toBe(false);
  });

  it("allows a legal adjacent travel", () => {
    const config = createConfig({ spawn: "oot-kokiri", openDeku: true });
    const session = createSession(config, 1);
    const next = travelTo(session, config, "oot-lost-woods");
    expect(next.penalties).toBe(0);
    expect(next.currentRegionId).toBe("oot-lost-woods");
    expect(REGION_BY_ID[next.currentRegionId].name).toBe("Lost Woods");
  });

  it("routes Kokiri to Hyrule Field through Lost Woods Bridge", () => {
    const config = createConfig({ spawn: "oot-kokiri", openForest: true });
    let session = createSession(config, 1);

    const skipBridge = travelTo(session, config, "oot-field");
    expect(skipBridge.currentRegionId).toBe("oot-kokiri");
    expect(skipBridge.penalties).toBe(1);

    const fromWoods = travelTo(travelTo(session, config, "oot-lost-woods"), config, "oot-field");
    expect(fromWoods.currentRegionId).toBe("oot-lost-woods");
    expect(fromWoods.penalties).toBe(1);

    session = travelTo(session, config, "oot-lost-woods-bridge");
    expect(session.currentRegionId).toBe("oot-lost-woods-bridge");
    expect(REGION_BY_ID[session.currentRegionId].name).toBe("Lost Woods Bridge");
    session = travelTo(session, config, "oot-field");
    expect(session.currentRegionId).toBe("oot-field");
    expect(session.penalties).toBe(0);
  });

  it("marks a failed check red via wrongIds and clears it after a later success", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    const mushroom = CHECK_BY_ID["oot-lost-woods-odd-mushroom"];
    const failed = collectCheck(session, config, mushroom);
    expect(failed.penalties).toBeGreaterThan(0);
    expect(failed.wrongIds).toContain(mushroom.id);

    const legal = collectCheck(
      { ...failed, inventory: [...failed.inventory, "ocarina", "saria"] },
      config,
      CHECK_BY_ID["oot-lost-woods-skull-kid"],
    );
    expect(legal.collectedCheckIds).toContain("oot-lost-woods-skull-kid");
    expect(legal.wrongIds).toContain(mushroom.id);
  });

  it("penalizes collecting the same check twice", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    session = { ...session, inventory: [...session.inventory, "ocarina", "saria"] };
    const skull = CHECK_BY_ID["oot-lost-woods-skull-kid"];
    session = collectCheck(session, config, skull);
    expect(session.collectedCheckIds).toContain(skull.id);
    const again = collectCheck(session, config, skull);
    expect(again.penalties).toBeGreaterThan(session.penalties);
  });

  it("starts adult at adult spawn, not Kokiri", () => {
    const config = createConfig({
      startingAge: "adult",
      childSpawn: "oot-lh",
      adultSpawn: "oot-kak",
    });
    const session = createSession(config, 1);
    expect(session.age).toBe("adult");
    expect(session.currentRegionId).toBe("oot-kak");
    expect(session.childSpawnId).toBe("oot-lh");
    expect(session.adultSpawnId).toBe("oot-kak");
  });

  it("respawns to the current age save warp", () => {
    const config = createConfig({ spawn: "oot-kokiri", childSpawn: "oot-kokiri", adultSpawn: "oot-tot" });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    const next = respawnToSpawn(session, config);
    expect(next.penalties).toBe(0);
    expect(next.currentRegionId).toBe("oot-kokiri");
  });

  it("sets Farore's Wind in a dungeon and warps back", () => {
    const config = createConfig({ spawn: "oot-kokiri", openDeku: true });
    let session = createSession(config, 1);
    session = { ...session, inventory: [...session.inventory, "farores", "magic"] };
    const outside = setFaroresWind(session, config);
    expect(outside.penalties).toBeGreaterThan(0);

    session = travelTo(session, config, "oot-deku");
    session = setFaroresWind(session, config);
    expect(session.faroresRegionId).toBe("oot-deku");
    session = travelTo(session, config, "oot-kokiri");
    const warped = warpFaroresWind(session, config);
    expect(warped.currentRegionId).toBe("oot-deku");
    expect(warped.penalties).toBe(0);
  });

  it("never announces leftover MM item ids", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    const skull = CHECK_BY_ID["oot-lost-woods-skull-kid"];
    session = {
      ...session,
      inventory: [...session.inventory, "ocarina", "saria"],
      placement: { ...session.placement, [skull.id]: "hookshot_mm" },
    };
    const next = collectCheck(session, config, skull);
    expect(next.lastFlash?.text).toBe("Got Junk");
    expect(next.lastFlash?.text.toLowerCase()).not.toContain(" mm");
    expect(itemLabel("hookshot_mm")).toBe("Junk");
  });
});
