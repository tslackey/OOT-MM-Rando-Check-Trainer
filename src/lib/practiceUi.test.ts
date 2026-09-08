import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { CHECK_BY_ID, availableWarps } from "../data/world";
import {
  canShowWarpTab,
  specialWarps,
  visibleExits,
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
});
