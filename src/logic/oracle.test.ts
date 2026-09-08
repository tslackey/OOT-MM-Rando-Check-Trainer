import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { CHECK_BY_ID, canUseConnection, checkInLogic, WORLD } from "../data/world";
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
    expect(canUseConnection(toWell, ["ocarina", "song_of_storms"], "adult")).toBe(false);
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
});
