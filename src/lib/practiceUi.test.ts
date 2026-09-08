import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { CHECK_BY_ID, availableWarps } from "../data/world";
import {
  canShowWarpTab,
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
    session = collectCheck(session, config, skull);
    const after = visibleRegionChecks(session).map((check) => check.id);
    expect(after).not.toContain("oot-lost-woods-skull-kid");
  });

  it("shows Deku Theater from Lost Woods only as child", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    expect(visibleExits(session, config).some((edge) => edge.to === "oot-deku-theater")).toBe(true);

    session = { ...session, age: "adult" };
    expect(visibleExits(session, config).some((edge) => edge.to === "oot-deku-theater")).toBe(false);
  });

  it("keeps warp songs hidden without an ocarina", () => {
    const config = createConfig({ games: { oot: true, mm: false } });
    const session = {
      ...createSession(config, 1),
      inventory: ["prelude", "requiem"],
    };
    expect(availableWarps(session.inventory)).toEqual([]);
    expect(visibleWarps(session, config)).toEqual([]);
    expect(canShowWarpTab(session, config)).toBe(false);
  });

  it("shows the warp tab only for owned songs plus ocarina", () => {
    const config = createConfig({ games: { oot: true, mm: false } });
    const session = {
      ...createSession(config, 1),
      inventory: ["ocarina", "prelude"],
    };
    expect(canShowWarpTab(session, config)).toBe(true);
    expect(visibleWarps(session, config).map((warp) => warp.item)).toEqual(["prelude"]);
  });
});
