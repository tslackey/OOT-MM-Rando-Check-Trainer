import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { CHECK_BY_ID, availableWarps } from "../data/world";
import {
  canShowWarpTab,
  inventoryGroups,
  specialWarps,
  visibleExits,
  visibleInventory,
  visibleRegionChecks,
  visibleWarps,
} from "./practiceUi";
import { collectCheck, createSession, travelTo } from "./session";

describe("practice UI filters", () => {
  it("hides collected checks and other-age checks", () => {
    const config = createConfig({
      spawn: "oot-kokiri",
      games: { oot: true, mm: false },
      startingAge: "child",
    });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    const before = visibleRegionChecks(session).map((check) => check.id);
    expect(before).toContain("oot-lost-woods-skull-kid");
    expect(before).not.toContain("oot-lost-woods-odd-mushroom");
    expect(before).not.toContain("oot-deku-theater-sticks-upgrade");

    const skull = CHECK_BY_ID["oot-lost-woods-skull-kid"];
    session = { ...session, inventory: [...session.inventory, "ocarina", "saria"] };
    session = collectCheck(session, config, skull);
    const after = visibleRegionChecks(session).map((check) => check.id);
    expect(after).not.toContain("oot-lost-woods-skull-kid");
  });

  it("offers Lost Woods Bridge from Kokiri and not Hyrule Field from the woods", () => {
    const config = createConfig({ spawn: "oot-kokiri", openForest: true, games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    const kokiriExits = visibleExits(session, config).map((edge) => edge.to);
    expect(kokiriExits).toContain("oot-lost-woods");
    expect(kokiriExits).toContain("oot-lost-woods-bridge");
    expect(kokiriExits).not.toContain("oot-field");

    session = travelTo(session, config, "oot-lost-woods");
    const woodsExits = visibleExits(session, config).map((edge) => edge.to);
    expect(woodsExits).toContain("oot-kokiri");
    expect(woodsExits).not.toContain("oot-field");
    expect(woodsExits).not.toContain("oot-lost-woods-bridge");
  });

  it("shows Deku Theater from Lost Woods only as child", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    expect(visibleExits(session, config).some((edge) => edge.to === "oot-deku-theater")).toBe(true);

    session = { ...session, age: "adult" };
    expect(visibleExits(session, config).some((edge) => edge.to === "oot-deku-theater")).toBe(false);
  });

  it("keeps warp songs hidden without an ocarina but still offers respawn", () => {
    const config = createConfig({ games: { oot: true, mm: false } });
    const session = {
      ...createSession(config, 1),
      inventory: ["prelude", "requiem"],
    };
    expect(availableWarps(session.inventory)).toEqual([]);
    expect(visibleWarps(session, config)).toEqual([]);
    expect(canShowWarpTab(session, config)).toBe(true);
    expect(specialWarps(session).some((warp) => warp.id === "respawn")).toBe(true);
  });

  it("shows owned warp songs plus ocarina", () => {
    const config = createConfig({ games: { oot: true, mm: false } });
    const session = {
      ...createSession(config, 1),
      inventory: ["ocarina", "prelude"],
    };
    expect(canShowWarpTab(session, config)).toBe(true);
    expect(visibleWarps(session, config).map((warp) => warp.item)).toEqual(["prelude"]);
  });

  it("lists child-only checks for adult when either-age logic is on", () => {
    const off = createConfig({ spawn: "oot-kokiri", eitherAgeLogic: false, openDoorOfTime: true });
    const on = createConfig({ spawn: "oot-kokiri", eitherAgeLogic: true, openDoorOfTime: true });
    const session = { ...createSession(off, 1), age: "adult" as const, currentRegionId: "oot-kokiri" };
    const sword = "oot-kokiri-forest-kokiri-sword-chest";
    expect(visibleRegionChecks(session, off).some((check) => check.id === sword)).toBe(false);
    expect(visibleRegionChecks(session, on).some((check) => check.id === sword)).toBe(true);
  });

  it("hides junk and open-world flags from the inventory tab", () => {
    expect(
      visibleInventory(["ocarina", "junk_1", "junk_2", "hookshot_mm", "open_forest", "cross_game", "saria"]),
    ).toEqual(["ocarina", "saria"]);
    expect(inventoryGroups(["junk_4", "hookshot_mm", "open_deku"])).toEqual([]);
  });

  it("groups and sorts inventory like the pause menu", () => {
    const groups = inventoryGroups([
      "prelude",
      "iron_boots",
      "ocarina",
      "saria",
      "small_key_water",
      "zelda_lullaby",
      "kokiri_sword",
      "junk_1",
      "open_forest",
      "small_key_forest",
      "small_key_forest",
      "boss_key_forest",
      "forest_medallion",
      "kokiri_emerald",
      "bombs",
      "hover_boots",
    ]);
    expect(groups.map((group) => group.title)).toEqual(["Items", "Equipment", "Songs", "Keys", "Quest"]);
    expect(groups.find((group) => group.title === "Items")?.items.map((item) => item.id)).toEqual(["bombs", "ocarina"]);
    expect(groups.find((group) => group.title === "Equipment")?.items.map((item) => item.id)).toEqual([
      "kokiri_sword",
      "iron_boots",
      "hover_boots",
    ]);
    expect(groups.find((group) => group.title === "Songs")?.items.map((item) => item.id)).toEqual([
      "zelda_lullaby",
      "saria",
      "prelude",
    ]);
    expect(groups.find((group) => group.title === "Keys")?.items).toEqual([
      { id: "small_key_forest", count: 2 },
      { id: "boss_key_forest", count: 1 },
      { id: "small_key_water", count: 1 },
    ]);
    expect(groups.find((group) => group.title === "Quest")?.items.map((item) => item.id)).toEqual([
      "kokiri_emerald",
      "forest_medallion",
    ]);
    expect(groups.flatMap((group) => group.items.map((item) => item.id))).not.toContain("junk_1");
  });
});
