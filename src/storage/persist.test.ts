import { afterEach, describe, expect, it } from "vitest";
import { loadState, STORAGE_KEY } from "./persist";
import type { PracticeSession } from "../data/types";

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
  };
}

describe("persist normalize", () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("strips MM checks and items from an in-progress run", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        configs: [],
        sessions: [],
        activeSession: staleSession(),
        lastConfigId: null,
        defaultConfigId: null,
        view: "practice",
        editingConfigId: null,
      }),
    );

    const state = await loadState();
    expect(state.activeSession?.currentRegionId).toBe("oot-kokiri");
    expect(state.activeSession?.enabledCheckIds).toEqual(["oot-graveyard-royal-tomb-song"]);
    expect(state.activeSession?.collectedCheckIds).toEqual([]);
    expect(state.activeSession?.inventory).toEqual(["ocarina"]);
    expect(state.activeSession?.placement["oot-graveyard-royal-tomb-song"]).toMatch(/^junk_/);
    expect(state.activeSession?.placement["mm-initial-song-of-healing"]).toBeUndefined();
  });
});
