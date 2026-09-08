import { describe, expect, it } from "vitest";
import { CHECK_BY_ID, checkInLogic } from "../data/world";
import { hasItem, makeState } from "./state";
import { locationNamedInLogic } from "./oracle";

function keys(id: string, count: number): string[] {
  return Array.from({ length: count }, () => id);
}

describe("dungeon interiors", () => {
  it("counts stacked small keys instead of collapsing them to one", () => {
    const state = makeState({
      age: "adult",
      inventory: keys("small_key_forest", 3),
    });
    expect(hasItem(state, "Small_Key_Forest_Temple", 3)).toBe(true);
    expect(hasItem(state, "Small_Key_Forest_Temple", 4)).toBe(false);
  });

  it("keeps Forest Temple Map off the lobby and behind Song of Time", () => {
    const map = CHECK_BY_ID["oot-forest-temple-map"];
    expect(map.ootrLocation).toBe("Forest Temple Map Chest");
    expect(checkInLogic(map, [], "adult", "oot-forest")).toBe(false);
    expect(checkInLogic(map, ["ocarina", "song_of_time"], "adult", "oot-forest")).toBe(true);
    expect(locationNamedInLogic("Forest Temple First Room Chest", "oot-forest", [], "adult")).toBe(true);
  });

  it("requires three Forest keys and strength for the bow chest", () => {
    const bow = CHECK_BY_ID["oot-forest-temple-bow"];
    expect(checkInLogic(bow, ["hookshot"], "adult", "oot-forest")).toBe(false);
    expect(checkInLogic(bow, [...keys("small_key_forest", 3)], "adult", "oot-forest")).toBe(false);
    expect(checkInLogic(bow, [...keys("small_key_forest", 3), "strength"], "adult", "oot-forest")).toBe(true);
  });

  it("does not treat the courtyard as legal from a false at(Falling Room)", () => {
    const garden = CHECK_BY_ID["oot-forest-temple-garden"];
    expect(garden.ootrLocation).toBe("Forest Temple Raised Island Courtyard Chest");
    expect(checkInLogic(garden, ["bow"], "adult", "oot-forest")).toBe(false);
    expect(checkInLogic(garden, ["bow", "hookshot"], "adult", "oot-forest")).toBe(true);
  });

  it("requires the Forest boss key after the interior path", () => {
    const boss = CHECK_BY_ID["oot-forest-temple-boss"];
    const path = [...keys("small_key_forest", 5), "strength", "bow"];
    expect(checkInLogic(boss, path, "adult", "oot-forest")).toBe(false);
    expect(checkInLogic(boss, [...path, "boss_key_forest"], "adult", "oot-forest")).toBe(true);
  });

  it("maps Fire Hammer to the Megaton Hammer chest, not a crate", () => {
    const hammer = CHECK_BY_ID["oot-fire-temple-hammer"];
    expect(hammer.ootrLocation).toBe("Fire Temple Megaton Hammer Chest");
    expect(checkInLogic(hammer, [], "adult", "oot-fire")).toBe(false);
    expect(checkInLogic(hammer, ["hookshot"], "adult", "oot-fire")).toBe(false);
  });

  it("keeps Shadow compass behind hover boots after the lens door", () => {
    const map = CHECK_BY_ID["oot-shadow-temple-map"];
    const compass = CHECK_BY_ID["oot-shadow-temple-compass"];
    expect(checkInLogic(map, [], "adult", "oot-shadow")).toBe(false);
    expect(checkInLogic(map, ["lens", "hookshot", "magic"], "adult", "oot-shadow")).toBe(true);
    expect(checkInLogic(compass, ["lens", "hookshot", "magic"], "adult", "oot-shadow")).toBe(false);
    expect(checkInLogic(compass, ["lens", "hookshot", "magic", "hover_boots"], "adult", "oot-shadow")).toBe(true);
  });

  it("needs iron boots to dive for Water Temple Map", () => {
    const map = CHECK_BY_ID["oot-water-temple-map"];
    expect(checkInLogic(map, ["hookshot"], "adult", "oot-water")).toBe(false);
    expect(checkInLogic(map, ["hookshot", "iron_boots"], "adult", "oot-water")).toBe(true);
  });
});
