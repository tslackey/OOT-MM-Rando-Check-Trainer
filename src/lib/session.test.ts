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

  it("marks a failed check red via wrongIds and clears it after a later success", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    const mushroom = CHECK_BY_ID["oot-lost-woods-odd-mushroom"];
    const failed = collectCheck(session, config, mushroom);
    expect(failed.penalties).toBeGreaterThan(0);
    expect(failed.wrongIds).toContain(mushroom.id);

    const legal = collectCheck(failed, config, CHECK_BY_ID["oot-lost-woods-skull-kid"]);
    expect(legal.collectedCheckIds).toContain("oot-lost-woods-skull-kid");
    expect(legal.wrongIds).toContain(mushroom.id);
  });

  it("penalizes collecting the same check twice", () => {
    const config = createConfig({ spawn: "oot-kokiri", games: { oot: true, mm: false } });
    let session = createSession(config, 1);
    session = travelTo(session, config, "oot-lost-woods");
    const skull = CHECK_BY_ID["oot-lost-woods-skull-kid"];
    session = collectCheck(session, config, skull);
    expect(session.collectedCheckIds).toContain(skull.id);
    const again = collectCheck(session, config, skull);
    expect(again.penalties).toBeGreaterThan(session.penalties);
  });
});
