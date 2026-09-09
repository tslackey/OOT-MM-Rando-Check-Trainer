import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import type { PracticeSession } from "../data/types";
import { createSession } from "../lib/session";
import { emptyState, normalizeState } from "./persist";

function staleSession(): PracticeSession {
  return {
    id: "stale",
    configId: "preset-oot-songs",
    configName: "OOT SONG MEMORY",
    startedAt: 1,
    updatedAt: 1,
    pausedMs: 0,
    currentRegionId: "mm-sct",
    age: "child",
    inventory: ["hookshot_mm", "ocarina"],
    collectedCheckIds: ["mm-initial-song-of-healing"],
    wrongIds: [],
    placement: {
      "oot-graveyard-royal-tomb-song": "hookshot_mm",
      "mm-initial-song-of-healing": "soaring",
    },
    enabledCheckIds: ["oot-graveyard-royal-tomb-song", "mm-initial-song-of-healing"],
    log: [],
    penalties: 0,
    penaltySeconds: 0,
    peekUsed: 0,
    childSpawnId: "mm-sct",
    adultSpawnId: "mm-clock-town",
    seed: 1,
  };
}

describe("persisted run slots", () => {
  it("migrates a v1 activeSession into the in-progress list", () => {
    const session = createSession(createConfig({ name: "legacy run" }), 1);
    const next = normalizeState({
      version: 1,
      configs: [],
      sessions: [],
      activeSession: session,
      lastConfigId: session.configId,
      defaultConfigId: null,
      view: "home",
      editingConfigId: null,
    });

    expect(next.version).toBe(2);
    expect(next.activeSessions).toEqual([session]);
    expect(next.currentSessionId).toBe(session.id);
    expect("activeSession" in next).toBe(false);
  });

  it("fills missing wrongIds on a migrated run", () => {
    const session = createSession(createConfig({ name: "legacy run" }), 1);
    const { wrongIds: _drop, ...withoutWrong } = session;
    const next = normalizeState({
      version: 1,
      activeSession: withoutWrong as typeof session,
    });
    expect(next.activeSessions[0]?.wrongIds).toEqual([]);
  });

  it("keeps up to three v2 in-progress runs", () => {
    const runs = [1, 2, 3, 4].map((n) => createSession(createConfig({ name: `run ${n}` }), n));
    const next = normalizeState({
      ...emptyState(),
      activeSessions: runs,
      currentSessionId: runs[2].id,
    });

    expect(next.activeSessions).toHaveLength(3);
    expect(next.currentSessionId).toBe(runs[2].id);
  });

  it("strips MM checks and items from an in-progress run", () => {
    const next = normalizeState({
      version: 1,
      configs: [],
      sessions: [],
      activeSession: staleSession(),
      lastConfigId: null,
      defaultConfigId: null,
      view: "practice",
      editingConfigId: null,
    });
    const session = next.activeSessions[0];
    expect(session?.currentRegionId).toBe("oot-kokiri");
    expect(session?.childSpawnId).toBe("oot-kokiri");
    expect(session?.adultSpawnId).toBe("oot-tot");
    expect(session?.enabledCheckIds).toEqual(["oot-graveyard-royal-tomb-song"]);
    expect(session?.collectedCheckIds).toEqual([]);
    expect(session?.inventory).toEqual(["ocarina"]);
    expect(session?.placement["oot-graveyard-royal-tomb-song"]).toMatch(/^junk_/);
    expect(session?.placement["mm-initial-song-of-healing"]).toBeUndefined();
  });

  it("strips leftover junk filler from inventory", () => {
    const session = {
      ...staleSession(),
      currentRegionId: "oot-kokiri",
      childSpawnId: "oot-kokiri",
      adultSpawnId: "oot-tot",
      inventory: ["ocarina", "junk_1", "junk_2", "saria"],
      enabledCheckIds: ["oot-graveyard-royal-tomb-song"],
      collectedCheckIds: [],
      placement: { "oot-graveyard-royal-tomb-song": "saria" },
    };
    const next = normalizeState({
      version: 2,
      configs: [],
      sessions: [],
      activeSessions: [session],
      currentSessionId: session.id,
    });
    expect(next.activeSessions[0]?.inventory).toEqual(["ocarina", "saria"]);
  });

  it("keeps the changelog view and falls back for unknown views", () => {
    expect(normalizeState({ ...emptyState(), view: "changelog" }).view).toBe("changelog");
    expect(normalizeState({ ...emptyState(), view: "not-a-view" as "home" }).view).toBe("home");
  });
});
