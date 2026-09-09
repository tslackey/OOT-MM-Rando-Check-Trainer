import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { CHECK_BY_ID, canUseConnection, checkInLogic, WORLD } from "../data/world";
import sample from "../lib/fixtures/ootr-spoiler-sample.json";
import { importRandoFile } from "../lib/importRando";
import { prepareGraphWorld } from "./graphPlugin";
import { doorOfTimeOpen, locationNamedInLogic } from "./oracle";

function edge(from: string, to: string) {
  const found = WORLD.connections.find((connection) => connection.from === from && connection.to === to);
  if (!found) throw new Error(`missing ${from} -> ${to}`);
  return found;
}

describe("OoTR practice oracle", () => {
  it("blocks Deku Theater Skull Mask without the mask and allows it with the mask", () => {
    const check = CHECK_BY_ID["oot-deku-theater-sticks-upgrade"];
    expect(checkInLogic(check, [], "child", "oot-deku-theater")).toBe(false);
    expect(checkInLogic(check, ["skull_mask"], "child", "oot-deku-theater")).toBe(true);
    expect(checkInLogic(check, ["skull_mask"], "adult", "oot-deku-theater")).toBe(false);
  });

  it("allows Song from Windmill as adult with an ocarina and no Song of Storms", () => {
    const check = CHECK_BY_ID["oot-windmill-song-of-storms"];
    expect(checkInLogic(check, ["ocarina"], "adult", "oot-kak")).toBe(true);
    expect(checkInLogic(check, ["ocarina", "song_of_storms"], "child", "oot-kak")).toBe(false);
  });

  it("blocks closed-forest child escape to Field and allows open forest", () => {
    const closed = createConfig({ openForest: false });
    const open = createConfig({ openForest: true });
    const toBridge = edge("oot-kokiri", "oot-lost-woods-bridge");
    const toField = edge("oot-lost-woods-bridge", "oot-field");
    expect(canUseConnection(toBridge, [], "child", closed)).toBe(false);
    expect(canUseConnection(toBridge, ["open_forest"], "child", open)).toBe(true);
    expect(canUseConnection(toField, ["open_forest"], "child", open)).toBe(true);
    expect(canUseConnection(toField, [], "child", closed)).toBe(true);
  });

  it("allows Forest Temple First Room without hookshot once adult is in Forest", () => {
    expect(locationNamedInLogic("Forest Temple First Room Chest", "oot-forest", [], "adult")).toBe(true);
    const map = CHECK_BY_ID["oot-forest-temple-map"];
    expect(map.ootrLocation).toBe("Forest Temple Map Chest");
    expect(checkInLogic(map, [], "adult", "oot-forest")).toBe(false);
    expect(checkInLogic(CHECK_BY_ID["oot-forest-temple-bow"], [], "adult", "oot-forest")).toBe(false);
  });

  it("blocks KF Kokiri Sword Chest as adult", () => {
    const sword = CHECK_BY_ID["oot-kokiri-forest-kokiri-sword-chest"];
    expect(checkInLogic(sword, [], "adult", "oot-kokiri")).toBe(false);
    expect(checkInLogic(sword, [], "child", "oot-kokiri")).toBe(true);
  });

  it("requires hookshot for SFM to Forest Temple", () => {
    const toForest = edge("oot-sfm", "oot-forest");
    expect(canUseConnection(toForest, ["open_forest"], "adult")).toBe(false);
    expect(canUseConnection(toForest, ["hookshot"], "adult")).toBe(true);
  });

  it("does not treat Light Arrows as the Ganon door key", () => {
    const toGanon = edge("oot-ganon-out", "oot-ganon");
    expect(canUseConnection(toGanon, ["light_arrows"], "adult")).toBe(false);
    expect(
      canUseConnection(toGanon, ["light_arrows", "shadow_medallion", "spirit_medallion"], "adult"),
    ).toBe(true);
  });

  it("lets a closed-forest child leave after Defeat Queen Gohma", () => {
    const closed = createConfig({ openForest: false });
    const toBridge = edge("oot-kokiri", "oot-lost-woods-bridge");
    expect(canUseConnection(toBridge, [], "child", closed)).toBe(false);
    expect(canUseConnection(toBridge, [], "child", closed, ["Defeat Queen Gohma"])).toBe(true);
  });

  it("opens Deku Tree when child shows Mido sword and shield", () => {
    const closed = createConfig({ openForest: false, openDeku: false });
    const toDeku = edge("oot-kokiri", "oot-deku");
    expect(canUseConnection(toDeku, [], "child", closed)).toBe(false);
    expect(canUseConnection(toDeku, ["kokiri_sword", "deku_shield"], "child", closed)).toBe(true);
  });

  it("drains the well as child with Song of Storms in Kakariko", () => {
    const toWell = edge("oot-kak", "oot-well");
    expect(canUseConnection(toWell, ["ocarina"], "child")).toBe(false);
    expect(canUseConnection(toWell, ["ocarina", "song_of_storms"], "child")).toBe(true);
    expect(canUseConnection(toWell, [], "child", undefined, ["Drain Well"])).toBe(true);
    expect(canUseConnection(toWell, ["ocarina", "song_of_storms"], "adult")).toBe(false);
  });

  it("needs the Epona event to cross Gerudo Valley without longshot", () => {
    const toFortress = edge("oot-gv", "oot-gf");
    expect(canUseConnection(toFortress, ["ocarina", "epona"], "adult")).toBe(false);
    expect(canUseConnection(toFortress, ["ocarina", "epona"], "adult", undefined, ["Epona"])).toBe(true);
    expect(canUseConnection(toFortress, ["longshot"], "adult")).toBe(true);
  });

  it("opens the Door of Time from settings or Song of Time", () => {
    const closed = createConfig({ openDoorOfTime: false, startingAge: "child" });
    const open = createConfig({ openDoorOfTime: true, startingAge: "child" });
    const adultStart = createConfig({ openDoorOfTime: false, startingAge: "adult" });
    expect(doorOfTimeOpen([], closed)).toBe(false);
    expect(doorOfTimeOpen(["ocarina", "song_of_time"], closed)).toBe(true);
    expect(doorOfTimeOpen([], open)).toBe(true);
    expect(doorOfTimeOpen([], adultStart)).toBe(true);
  });

  it("does not mark KF night GS in logic for a forest-locked child", () => {
    const closed = createConfig({ openForest: false });
    expect(locationNamedInLogic("KF GS Know It All House", "oot-kokiri", ["kokiri_sword"], "child", closed)).toBe(
      false,
    );
    expect(
      locationNamedInLogic("KF GS Know It All House", "oot-kokiri", ["kokiri_sword", "ocarina", "suns_song"], "child", closed),
    ).toBe(true);
    expect(
      locationNamedInLogic(
        "KF GS Know It All House",
        "oot-kokiri",
        ["kokiri_sword"],
        "child",
        closed,
        ["Defeat Queen Gohma"],
      ),
    ).toBe(true);
  });

  it("keeps either-age checks off unless the Door of Time is open", () => {
    const windmill = CHECK_BY_ID["oot-windmill-song-of-storms"];
    const off = createConfig({ openDoorOfTime: true, eitherAgeLogic: false });
    const on = createConfig({ openDoorOfTime: true, eitherAgeLogic: true });
    const locked = createConfig({ openDoorOfTime: false, eitherAgeLogic: true });
    expect(checkInLogic(windmill, ["ocarina"], "child", "oot-kak", off)).toBe(false);
    expect(checkInLogic(windmill, ["ocarina"], "child", "oot-kak", on)).toBe(true);
    expect(checkInLogic(windmill, ["ocarina"], "child", "oot-kak", locked)).toBe(false);
    expect(checkInLogic(windmill, ["ocarina", "song_of_time"], "child", "oot-kak", locked)).toBe(true);
  });

  it("uses imported rainbow bridge condition and counts for Ganon's door", () => {
    const toGanon = edge("oot-ganon-out", "oot-ganon");
    const sixRewards = [
      "kokiri_emerald",
      "goron_ruby",
      "zora_sapphire",
      "forest_medallion",
      "fire_medallion",
      "water_medallion",
    ];
    const imported = importRandoFile(JSON.stringify(sample), "spoiler.json").config;
    expect(canUseConnection(toGanon, sixRewards, "adult", imported)).toBe(true);
    expect(canUseConnection(toGanon, sixRewards.slice(0, 5), "adult", imported)).toBe(false);
    expect(canUseConnection(toGanon, sixRewards, "adult")).toBe(false);

    const open = createConfig({ randoSettings: { "Rainbow Bridge": "Open" } });
    expect(canUseConnection(toGanon, [], "adult", open)).toBe(true);

    const stones = createConfig({
      randoSettings: { "Rainbow Bridge": "Stones", "Bridge Stone Count": "3" },
    });
    expect(canUseConnection(toGanon, ["kokiri_emerald", "goron_ruby", "zora_sapphire"], "adult", stones)).toBe(true);
    expect(canUseConnection(toGanon, ["kokiri_emerald", "goron_ruby"], "adult", stones)).toBe(false);
  });

  it("uses imported LACS condition for the Temple of Time light arrows", () => {
    const vanilla = createConfig({ randoSettings: { "LACS Condition": "Vanilla" } });
    expect(locationNamedInLogic("ToT Light Arrows Cutscene", "oot-tot", ["shadow_medallion"], "adult", vanilla)).toBe(
      false,
    );
    expect(
      locationNamedInLogic(
        "ToT Light Arrows Cutscene",
        "oot-tot",
        ["shadow_medallion", "spirit_medallion"],
        "adult",
        vanilla,
      ),
    ).toBe(true);

    const stones = createConfig({
      randoSettings: { "LACS Condition": "Stones", "LACS Stone Count": "3" },
    });
    expect(locationNamedInLogic("ToT Light Arrows Cutscene", "oot-tot", ["kokiri_emerald", "goron_ruby"], "adult", stones)).toBe(
      false,
    );
    expect(
      locationNamedInLogic(
        "ToT Light Arrows Cutscene",
        "oot-tot",
        ["kokiri_emerald", "goron_ruby", "zora_sapphire"],
        "adult",
        stones,
      ),
    ).toBe(true);
  });

  it("uses imported Ganon boss key condition on Gift from Sages", () => {
    const meds = createConfig({
      randoSettings: {
        "Ganon's Boss Key": "Medallions",
        "Ganon's Boss Key Medallion Count": "6",
      },
    });
    const world = prepareGraphWorld(
      ["forest_medallion", "fire_medallion", "water_medallion", "shadow_medallion", "spirit_medallion"],
      meds,
    );
    const loc = world.get_location("Gift from Sages");
    expect(loc.access_rule(world.state, { spot: loc, age: "adult" })).toBe(false);

    const enough = prepareGraphWorld(
      [
        "forest_medallion",
        "fire_medallion",
        "water_medallion",
        "shadow_medallion",
        "spirit_medallion",
        "light_medallion",
      ],
      meds,
    );
    const ready = enough.get_location("Gift from Sages");
    expect(ready.access_rule(enough.state, { spot: ready, age: "adult" })).toBe(true);

    const vanilla = prepareGraphWorld([], createConfig());
    const gift = vanilla.get_location("Gift from Sages");
    expect(gift.access_rule(vanilla.state, { spot: gift, age: "adult" })).toBe(true);
  });

  it("treats Shuffle Open Chest as a progressive ability, not a check type", () => {
    const prog = createConfig({ randoSettings: { "Shuffle Open Chest": "Progressive" } });
    expect(locationNamedInLogic("KF Kokiri Sword Chest", "oot-kokiri", [], "child", prog)).toBe(false);
    expect(locationNamedInLogic("KF Kokiri Sword Chest", "oot-kokiri", ["open_chest"], "child", prog)).toBe(true);
    expect(locationNamedInLogic("Deku Tree Slingshot Chest", "oot-deku", ["deku_shield", "open_chest"], "child", prog)).toBe(
      false,
    );
    expect(
      locationNamedInLogic(
        "Deku Tree Slingshot Chest",
        "oot-deku",
        ["deku_shield", "open_chest", "open_chest"],
        "child",
        prog,
      ),
    ).toBe(true);

    const on = createConfig({ randoSettings: { "Shuffle Open Chest": "On" } });
    expect(locationNamedInLogic("Deku Tree Slingshot Chest", "oot-deku", ["deku_shield", "open_chest"], "child", on)).toBe(
      true,
    );
    expect(locationNamedInLogic("KF Kokiri Sword Chest", "oot-kokiri", [], "child")).toBe(true);
  });
});
