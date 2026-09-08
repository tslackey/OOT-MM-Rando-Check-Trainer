import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { collectCheck, createSession, travelTo } from "./session";
import { CHECK_BY_ID, REGION_BY_ID } from "../data/world";

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

  it("penalizes collecting the same check twice", () => {
    const config = createConfig({
      spawn: "oot-kokiri",
      checkTypes: {
        chest: true,
        song: false,
        dungeonReward: false,
        scrub: false,
        shop: false,
        trade: false,
        skullReward: false,
      },
    });
    const sword = CHECK_BY_ID["oot-kokiri-forest-kokiri-sword-chest"];
    expect(sword).toBeTruthy();
    let session = createSession(config, 1);
    session = collectCheck(session, config, sword);
    expect(session.collectedCheckIds).toContain(sword.id);
    const again = collectCheck(session, config, sword);
    expect(again.penalties).toBeGreaterThan(session.penalties);
  });
});
