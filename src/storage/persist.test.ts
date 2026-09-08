import { describe, expect, it } from "vitest";
import { createConfig } from "../data/presets";
import { createSession } from "../lib/session";
import { emptyState, normalizeState } from "./persist";

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
});
