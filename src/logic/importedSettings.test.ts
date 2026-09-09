import { describe, expect, it } from "vitest";
import { importedLogicSettings } from "./importedSettings";

describe("imported bridge / LACS / Ganon BK settings", () => {
  it("maps Ackbar dungeon-reward bridge and count", () => {
    expect(
      importedLogicSettings({
        "Rainbow Bridge": "Dungeon rewards",
        "Bridge Reward Count": "6",
      }),
    ).toEqual({ bridge: "dungeons", bridge_rewards: 6 });
  });

  it("maps open bridge, stone LACS, and medallion Ganon BK", () => {
    expect(
      importedLogicSettings({
        "Rainbow Bridge": "Open",
        "LACS Condition": "Stones",
        "LACS Stone Count": "3",
        "Ganon's Boss Key": "Medallions",
        "Ganon's Boss Key Medallion Count": "6",
      }),
    ).toMatchObject({
      bridge: "open",
      lacs_condition: "stones",
      lacs_stones: 3,
      shuffle_ganon_bosskey: "medallions",
      ganon_bosskey_medallions: 6,
    });
  });

  it("maps own-dungeon Ganon BK as dungeon, not dungeon-rewards", () => {
    expect(importedLogicSettings({ "Ganon's Boss Key": "Vanilla" }).shuffle_ganon_bosskey).toBe("dungeon");
    expect(importedLogicSettings({ "Ganon's Boss Key": "Own Dungeon" }).shuffle_ganon_bosskey).toBe("dungeon");
    expect(importedLogicSettings({ "Ganon's Boss Key": "On LACS" }).shuffle_ganon_bosskey).toBe("on_lacs");
    expect(
      importedLogicSettings({
        "Shuffle Ganon's Boss Key": "Dungeon rewards",
        "Ganon's Boss Key Dungeon Count": "3",
      }),
    ).toEqual({
      shuffle_ganon_bosskey: "dungeons",
      ganon_bosskey_rewards: 3,
    });
  });
});
