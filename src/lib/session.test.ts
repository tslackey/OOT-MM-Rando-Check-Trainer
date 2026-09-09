import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { collectCheck, createSession, respawnToSpawn, setFaroresWind, switchAge, travelTo, warpFaroresWind } from "./session";
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

  it("stacks duplicate small keys in inventory", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    const sword = CHECK_BY_ID["oot-kokiri-forest-kokiri-sword-chest"];
    const mido = CHECK_BY_ID["oot-mido-s-house-top-left"];
    session = {
      ...session,
      placement: {
        ...session.placement,
        [sword.id]: "small_key_forest",
        [mido.id]: "small_key_forest",
      },
    };
    session = collectCheck(session, config, sword);
    session = collectCheck(session, config, mido);
    expect(session.inventory.filter((item) => item === "small_key_forest")).toEqual([
      "small_key_forest",
      "small_key_forest",
    ]);
  });

  it("keeps stacked keys when they are starting items", () => {
    const config = createConfig({
      spawn: "oot-sfm",
      startingAge: "adult",
      startingItems: ["hookshot", "small_key_forest", "small_key_forest", "small_key_forest", "strength"],
    });
    const session = createSession(config, 1);
    expect(session.inventory.filter((item) => item === "small_key_forest")).toHaveLength(3);
  });

  it("opens closed forest after collecting Queen Gohma", () => {
    const config = createConfig({ openForest: false, openDeku: true, spawn: "oot-kokiri" });
    let session = createSession(config, 1);
    const blocked = travelTo(session, config, "oot-lost-woods-bridge");
    expect(blocked.currentRegionId).toBe("oot-kokiri");
    expect(blocked.penalties).toBeGreaterThan(0);

    const boss = CHECK_BY_ID["oot-deku-tree-boss"];
    session = {
      ...session,
      currentRegionId: "oot-deku",
      inventory: [...session.inventory, "slingshot", "nuts", "deku_shield", "kokiri_sword", "sticks"],
    };
    session = collectCheck(session, config, boss);
    expect(session.collectedCheckIds).toContain(boss.id);
    expect(session.logicEvents).toContain("Defeat Queen Gohma");

    session = { ...session, currentRegionId: "oot-kokiri" };
    const escaped = travelTo(session, config, "oot-lost-woods-bridge");
    expect(escaped.penalties).toBe(session.penalties);
    expect(escaped.currentRegionId).toBe("oot-lost-woods-bridge");
  });

  it("persists Dampe windmill access after visiting the grave as adult", () => {
    const config = createConfig({ startingAge: "adult", spawn: "oot-kak" });
    let session = createSession(config, 1);
    session = {
      ...session,
      age: "adult",
      currentRegionId: "oot-kak",
      inventory: [...session.inventory, "ocarina", "song_of_time"],
    };
    const hp = CHECK_BY_ID["oot-windmill-hp"];
    expect(collectCheck(session, config, hp).collectedCheckIds).not.toContain(hp.id);

    session = travelTo(session, config, "oot-graveyard");
    expect(session.logicEvents).toContain("Dampes Windmill Access");
    session = travelTo(session, config, "oot-kak");
    session = collectCheck(session, config, hp);
    expect(session.collectedCheckIds).toContain(hp.id);
  });

  it("records Drain Well when child visits Kakariko with Song of Storms", () => {
    const config = createConfig({ spawn: "oot-kak", childSpawn: "oot-kak" });
    let session = createSession(config, 1);
    const dry = travelTo(session, config, "oot-well");
    expect(dry.currentRegionId).toBe("oot-kak");
    expect(dry.penalties).toBe(1);

    session = { ...session, inventory: [...session.inventory, "ocarina", "song_of_storms"] };
    const drained = travelTo(session, config, "oot-well");
    expect(drained.currentRegionId).toBe("oot-well");
    expect(drained.logicEvents).toContain("Drain Well");
    expect(drained.penalties).toBe(0);
  });

  it("registers Epona at the ranch so Gerudo Valley can be crossed later", () => {
    const config = createConfig({
      startingAge: "adult",
      adultSpawn: "oot-llr",
      startingItems: ["ocarina", "epona"],
    });
    let session = createSession(config, 1);
    expect(session.logicEvents).toContain("Epona");
    session = travelTo(session, config, "oot-field");
    session = travelTo(session, config, "oot-gv");
    session = travelTo(session, config, "oot-gf");
    expect(session.currentRegionId).toBe("oot-gf");
    expect(session.penalties).toBe(0);
  });

  it("requires Song of Time to swap age when the Door of Time is closed", () => {
    const config = createConfig({ openDoorOfTime: false, spawn: "oot-tot", startingAge: "child" });
    let session = createSession(config, 1);
    session = { ...session, currentRegionId: "oot-tot" };
    const blocked = switchAge(session, config);
    expect(blocked.age).toBe("child");
    expect(blocked.penalties).toBeGreaterThan(0);

    session = { ...session, inventory: [...session.inventory, "ocarina", "song_of_time"] };
    const swapped = switchAge(session, config);
    expect(swapped.age).toBe("adult");
    expect(swapped.penalties).toBe(session.penalties);
  });
});
