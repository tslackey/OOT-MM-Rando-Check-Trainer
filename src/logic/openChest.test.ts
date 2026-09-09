import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { chestAbilityAllows, openChestCopies, openChestShuffle, vanillaChestIsLarge } from "./openChest";

describe("Shuffle Open Chest", () => {
  it("treats missing or Off as vanilla innate opening", () => {
    expect(openChestShuffle(undefined)).toBe("off");
    expect(openChestShuffle({ "Shuffle Open Chest": "Off" })).toBe("off");
  });

  it("maps On vs Progressive", () => {
    expect(openChestShuffle({ "Shuffle Open Chest": "On" })).toBe("on");
    expect(openChestShuffle({ "Shuffle Open Chest": "Progressive" })).toBe("progressive");
  });

  it("counts stacked Open Chests copies from inventory", () => {
    expect(openChestCopies([])).toBe(0);
    expect(openChestCopies(["open_chest"])).toBe(1);
    expect(openChestCopies(["open_chest", "open_chest", "bow"])).toBe(2);
  });

  it("treats Mido / grottos / Kokiri Sword as small and Deku slingshot as large", () => {
    expect(vanillaChestIsLarge("KF Midos Top Left Chest")).toBe(false);
    expect(vanillaChestIsLarge("KF Storms Grotto Chest")).toBe(false);
    expect(vanillaChestIsLarge("KF Kokiri Sword Chest")).toBe(false);
    expect(vanillaChestIsLarge("Deku Tree Slingshot Chest")).toBe(true);
    expect(vanillaChestIsLarge("Deku Tree Slingshot Room Side Chest")).toBe(false);
  });

  it("does not gate NPCs, and Off does not gate chests", () => {
    const off = createConfig();
    expect(chestAbilityAllows("Song from Impa", "Song", [], off)).toBe(true);
    expect(chestAbilityAllows("KF Kokiri Sword Chest", "Chest", [], off)).toBe(true);
  });

  it("On needs one copy for small and large chests", () => {
    const on = createConfig({ randoSettings: { "Shuffle Open Chest": "On" } });
    expect(chestAbilityAllows("KF Kokiri Sword Chest", "Chest", [], on)).toBe(false);
    expect(chestAbilityAllows("KF Kokiri Sword Chest", "Chest", ["open_chest"], on)).toBe(true);
    expect(chestAbilityAllows("Deku Tree Slingshot Chest", "Chest", ["open_chest"], on)).toBe(true);
  });

  it("Progressive needs small then large", () => {
    const prog = createConfig({ randoSettings: { "Shuffle Open Chest": "Progressive" } });
    expect(chestAbilityAllows("KF Kokiri Sword Chest", "Chest", [], prog)).toBe(false);
    expect(chestAbilityAllows("KF Kokiri Sword Chest", "Chest", ["open_chest"], prog)).toBe(true);
    expect(chestAbilityAllows("Deku Tree Slingshot Chest", "Chest", ["open_chest"], prog)).toBe(false);
    expect(chestAbilityAllows("Deku Tree Slingshot Chest", "Chest", ["open_chest", "open_chest"], prog)).toBe(true);
  });
});
