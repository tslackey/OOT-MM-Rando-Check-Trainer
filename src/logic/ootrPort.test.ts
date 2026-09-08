import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { CHECK_BY_ID, canUseConnection, checkInLogic, WORLD } from "../data/world";
import { HELPER_COMPILE_ERRORS, evalText } from "./eval";
import { locationNamedInLogic } from "./oracle";
import { makeState } from "./state";
import { WORLD_COMPILE_ERRORS } from "./worldLogic";

function edge(from: string, to: string) {
  const found = WORLD.connections.find((connection) => connection.from === from && connection.to === to);
  if (!found) throw new Error(`missing ${from} -> ${to}`);
  return found;
}

/**
 * Ported from vendored OoTR `LogicHelpers.json` + `State.py` + vanilla World JSON.
 * OoTR's own `tests/` folder is fill/plando, not unit rules; these are the
 * rules that file actually evaluates.
 */
describe("OoTR World JSON + LogicHelpers compile", () => {
  it("compiles every LogicHelpers entry", () => {
    expect(HELPER_COMPILE_ERRORS).toEqual([]);
  });

  it("compiles every vendored location, exit, and event rule", () => {
    expect(WORLD_COMPILE_ERRORS).toEqual([]);
  });
});

describe("OoTR State.py methods", () => {
  it("has_bottle matches State.has_bottle", () => {
    expect(evalText("has_bottle", makeState({ age: "child", inventory: [] }))).toBe(false);
    expect(evalText("has_bottle", makeState({ age: "child", inventory: ["bottle"] }))).toBe(true);
  });

  it("has_hearts counts 3 starting hearts plus containers and pieces", () => {
    const empty = makeState({ age: "adult", inventory: [] });
    expect(evalText("has_hearts(3)", empty)).toBe(true);
    expect(evalText("has_hearts(4)", empty)).toBe(false);
    const pieces = makeState({ age: "adult", inventory: [] });
    pieces.items.set("Piece_of_Heart", 4);
    expect(evalText("has_hearts(4)", pieces)).toBe(true);
    expect(evalText("has_hearts(5)", pieces)).toBe(false);
  });

  it("can_live_dmg follows State.can_live_dmg for normal multiplier", () => {
    const empty = makeState({ age: "adult", inventory: [] });
    expect(evalText("can_live_dmg(0.5, False)", empty)).toBe(true);
    expect(evalText("can_live_dmg(3, False)", empty)).toBe(false);
    const ohko = makeState({ age: "adult", inventory: [] });
    ohko.settings.damage_multiplier = "ohko";
    expect(evalText("can_live_dmg(0.5, False)", ohko)).toBe(false);
  });
});

describe("OoTR LogicHelpers evaluation", () => {
  it("can_use is age-locked the way _is_child_item / _is_adult_item are", () => {
    const childSling = makeState({ age: "child", inventory: ["slingshot"] });
    const adultSling = makeState({ age: "adult", inventory: ["slingshot"] });
    const childBow = makeState({ age: "child", inventory: ["bow"] });
    const adultBow = makeState({ age: "adult", inventory: ["bow"] });
    expect(evalText("can_use(Slingshot)", childSling)).toBe(true);
    expect(evalText("can_use(Slingshot)", adultSling)).toBe(false);
    expect(evalText("can_use(Bow)", childBow)).toBe(false);
    expect(evalText("can_use(Bow)", adultBow)).toBe(true);
  });

  it("can_use(Hookshot) / Longshot follow Progressive_Hookshot counts", () => {
    const hook = makeState({ age: "adult", inventory: ["hookshot"] });
    const long = makeState({ age: "adult", inventory: ["longshot"] });
    const childHook = makeState({ age: "child", inventory: ["hookshot"] });
    expect(evalText("can_use(Hookshot)", hook)).toBe(true);
    expect(evalText("can_use(Longshot)", hook)).toBe(false);
    expect(evalText("can_use(Longshot)", long)).toBe(true);
    expect(evalText("can_use(Hookshot)", childHook)).toBe(false);
  });

  it("can_use magic items requires Magic_Meter", () => {
    const dins = makeState({ age: "adult", inventory: ["dins"] });
    const magic = makeState({ age: "adult", inventory: ["dins", "magic"] });
    expect(evalText("can_use(Dins_Fire)", dins)).toBe(false);
    expect(evalText("can_use(Dins_Fire)", magic)).toBe(true);
  });

  it("has_explosives is Bomb_Bag, not a fake bombs flag", () => {
    expect(evalText("has_explosives", makeState({ age: "child", inventory: [] }))).toBe(false);
    expect(evalText("has_explosives", makeState({ age: "child", inventory: ["bombs"] }))).toBe(true);
  });

  it("can_play needs an ocarina and the song", () => {
    const songOnly = makeState({ age: "adult", inventory: ["song_of_time"] });
    const both = makeState({ age: "adult", inventory: ["ocarina", "song_of_time"] });
    expect(evalText("can_play(Song_of_Time)", songOnly)).toBe(false);
    expect(evalText("can_play(Song_of_Time)", both)).toBe(true);
  });

  it("can_open_door_of_time follows the helper, not SoT alone", () => {
    const sot = createConfig({ openDoorOfTime: false });
    const open = createConfig({ openDoorOfTime: true });
    expect(evalText("can_open_door_of_time", makeState({ age: "child", inventory: ["ocarina"], config: sot }))).toBe(
      false,
    );
    expect(
      evalText(
        "can_open_door_of_time",
        makeState({ age: "child", inventory: ["ocarina", "song_of_time"], config: sot }),
      ),
    ).toBe(true);
    expect(evalText("can_open_door_of_time", makeState({ age: "child", inventory: [], config: open }))).toBe(true);
  });

  it("can_build_rainbow_bridge is vanilla medallions + light arrows", () => {
    const arrows = makeState({ age: "adult", inventory: ["light_arrows"] });
    const vanilla = makeState({
      age: "adult",
      inventory: ["light_arrows", "shadow_medallion", "spirit_medallion"],
    });
    const hearts = makeState({ age: "adult", inventory: [] });
    hearts.settings.bridge = "hearts";
    hearts.settings.bridge_hearts = 20;
    expect(evalText("can_build_rainbow_bridge", arrows)).toBe(false);
    expect(evalText("can_build_rainbow_bridge", vanilla)).toBe(true);
    expect(evalText("can_build_rainbow_bridge", hearts)).toBe(false);
  });

  it("can_leave_forest matches the helper, including the Gohma event", () => {
    const closed = makeState({ age: "child", inventory: [] });
    const gohma = makeState({ age: "child", inventory: [], events: ["Defeat Queen Gohma"] });
    const open = makeState({ age: "child", inventory: ["open_forest"] });
    const adult = makeState({ age: "adult", inventory: [] });
    expect(evalText("can_leave_forest", closed)).toBe(false);
    expect(evalText("can_leave_forest", gohma)).toBe(true);
    expect(evalText("can_leave_forest", open)).toBe(true);
    expect(evalText("can_leave_forest", adult)).toBe(true);
  });

  it("reads skipped_trials[Forest] as a settings key, not an item named Forest", () => {
    const skipped = makeState({ age: "adult", inventory: [] });
    expect(evalText("skipped_trials[Forest]", skipped)).toBe(true);
    const vanilla = makeState({ age: "adult", inventory: [] });
    vanilla.settings.skipped_trials = {
      Forest: false,
      Fire: false,
      Water: false,
      Shadow: false,
      Spirit: false,
      Light: false,
    };
    expect(evalText("skipped_trials[Forest]", vanilla)).toBe(false);
    expect(evalText("skipped_trials[Forest] or 'Forest Trial Clear'", vanilla)).toBe(false);
  });
});

describe("OoTR World JSON location and exit cases", () => {
  it("Deku Theater masks (Overworld.json)", () => {
    const skull = CHECK_BY_ID["oot-deku-theater-sticks-upgrade"];
    const truth = CHECK_BY_ID["oot-deku-theater-nuts-upgrade"];
    expect(checkInLogic(skull, [], "child", "oot-deku-theater")).toBe(false);
    expect(checkInLogic(skull, ["skull_mask"], "child", "oot-deku-theater")).toBe(true);
    expect(checkInLogic(truth, ["mask_of_truth"], "child", "oot-deku-theater")).toBe(true);
    expect(checkInLogic(truth, ["mask_of_truth"], "adult", "oot-deku-theater")).toBe(false);
  });

  it("Song from Windmill is adult + ocarina, not Song of Storms (Kak Windmill)", () => {
    expect(locationNamedInLogic("Song from Windmill", "oot-kak", ["ocarina"], "adult")).toBe(true);
    expect(locationNamedInLogic("Song from Windmill", "oot-kak", ["ocarina", "song_of_storms"], "child")).toBe(false);
  });

  it("KF Kokiri Sword Chest is child-only", () => {
    expect(locationNamedInLogic("KF Kokiri Sword Chest", "oot-kokiri", [], "child")).toBe(true);
    expect(locationNamedInLogic("KF Kokiri Sword Chest", "oot-kokiri", [], "adult")).toBe(false);
  });

  it("Deku Tree Slingshot Room needs has_shield (here)", () => {
    expect(locationNamedInLogic("Deku Tree Slingshot Chest", "oot-deku", [], "child")).toBe(false);
    expect(locationNamedInLogic("Deku Tree Slingshot Chest", "oot-deku", ["deku_shield"], "child")).toBe(true);
    expect(locationNamedInLogic("Deku Tree Map Chest", "oot-deku", [], "child")).toBe(true);
  });

  it("Forest Temple First Room Chest is True in the lobby; bow chest is not", () => {
    expect(locationNamedInLogic("Forest Temple First Room Chest", "oot-forest", [], "adult")).toBe(true);
    expect(checkInLogic(CHECK_BY_ID["oot-forest-temple-map"], [], "adult", "oot-forest")).toBe(true);
    expect(locationNamedInLogic("Forest Temple Map Chest", "oot-forest", [], "adult")).toBe(false);
    expect(checkInLogic(CHECK_BY_ID["oot-forest-temple-bow"], [], "adult", "oot-forest")).toBe(false);
  });

  it("Forest Temple Raised Island Courtyard Chest does not treat at(Falling Room) as True", () => {
    expect(locationNamedInLogic("Forest Temple Raised Island Courtyard Chest", "oot-forest", ["bow"], "adult")).toBe(
      false,
    );
    expect(
      locationNamedInLogic(
        "Forest Temple Raised Island Courtyard Chest",
        "oot-forest",
        ["bow", "hookshot"],
        "adult",
      ),
    ).toBe(true);
  });

  it("Drain Well is a child Song of Storms event; adult SoS does not open Kak → Well", () => {
    const well = edge("oot-kak", "oot-well");
    expect(canUseConnection(well, ["ocarina", "song_of_storms"], "child")).toBe(true);
    expect(canUseConnection(well, ["ocarina"], "child")).toBe(false);
    expect(canUseConnection(well, ["ocarina", "song_of_storms"], "adult")).toBe(false);
  });

  it("KF → Field is can_leave_forest, not a Lost Woods shortcut", () => {
    const closed = createConfig({ openForest: false });
    const open = createConfig({ openForest: true });
    const toBridge = edge("oot-kokiri", "oot-lost-woods-bridge");
    const toField = edge("oot-lost-woods-bridge", "oot-field");
    expect(canUseConnection(toBridge, [], "child", closed)).toBe(false);
    expect(canUseConnection(toBridge, ["open_forest"], "child", open)).toBe(true);
    expect(canUseConnection(toField, ["open_forest"], "child", open)).toBe(true);
  });

  it("Ganon door is rainbow bridge, not Light Arrows as a key", () => {
    const toGanon = edge("oot-ganon-out", "oot-ganon");
    expect(canUseConnection(toGanon, ["light_arrows"], "adult")).toBe(false);
    expect(
      canUseConnection(toGanon, ["light_arrows", "shadow_medallion", "spirit_medallion"], "adult"),
    ).toBe(true);
  });

  it("skipped trials open Ganon tower from the castle interior; vanilla trials do not", () => {
    expect(locationNamedInLogic("Ganons Castle Forest Trial Chest", "oot-ganon", ["kokiri_sword"], "child")).toBe(
      true,
    );
    const skipped = makeState({ age: "adult", inventory: [] });
    skipped.practiceId = "oot-ganon";
    skipped.reachable.add("Ganons Castle Lobby");
    skipped.reachable.add("Ganons Castle Main");
    expect(evalText("skipped_trials[Forest] and skipped_trials[Fire]", skipped)).toBe(true);
  });
});
