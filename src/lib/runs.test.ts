import { describe, expect, it } from "vitest";
import { emptyState } from "../storage/persist";
import { createConfig } from "../data/presets";
import { createSession, summarize } from "./session";
import {
  canStartSession,
  currentSession,
  withArchivedSession,
  withDeletedActiveSession,
  withReplacedCurrentSession,
  withResumedSession,
  withStartedSession,
  withUpdatedSession,
} from "./runs";

function sessionNamed(name: string, updatedAt = Date.now()) {
  const session = createSession(createConfig({ name }), 1);
  return { ...session, updatedAt };
}

describe("in-progress run slots", () => {
  it("starts up to three runs and refuses a fourth", () => {
    let state = emptyState();
    const first = sessionNamed("one");
    const second = sessionNamed("two");
    const third = sessionNamed("three");
    const fourth = sessionNamed("four");

    state = withStartedSession(state, first);
    state = withStartedSession(state, second);
    state = withStartedSession(state, third);

    expect(state.activeSessions).toHaveLength(3);
    expect(canStartSession(state)).toBe(false);
    expect(withStartedSession(state, fourth)).toEqual(state);
    expect(currentSession(state)?.id).toBe(third.id);
  });

  it("resumes a listed run without dropping the others", () => {
    const first = sessionNamed("one", 1);
    const second = sessionNamed("two", 2);
    let state = withStartedSession(emptyState(), first);
    state = withStartedSession(state, second);
    expect(state.activeSessions.find((session) => session.id === first.id)?.pausedAt).toBeTruthy();
    state = withResumedSession(state, first.id);

    expect(state.currentSessionId).toBe(first.id);
    expect(state.view).toBe("practice");
    expect(state.activeSessions.map((session) => session.id)).toEqual([first.id, second.id]);
    expect(state.activeSessions.find((session) => session.id === second.id)?.pausedAt).toBeTruthy();
  });

  it("deletes a listed run instead of resuming it", () => {
    const first = sessionNamed("one", 10);
    const second = sessionNamed("two", 20);
    let state = withStartedSession(emptyState(), first);
    state = withStartedSession(state, second);
    state = withDeletedActiveSession(state, first.id);

    expect(state.activeSessions.map((session) => session.id)).toEqual([second.id]);
    expect(state.currentSessionId).toBe(second.id);
  });

  it("replaces the current run on restart and archives without keeping the slot", () => {
    const original = sessionNamed("original", 1);
    const restarted = sessionNamed("restarted", 2);
    let state = withStartedSession(emptyState(), original);
    state = withReplacedCurrentSession(state, restarted);

    expect(state.activeSessions).toHaveLength(1);
    expect(state.currentSessionId).toBe(restarted.id);

    const moved = { ...restarted, collectedCheckIds: restarted.enabledCheckIds.slice(0, 1) };
    state = withUpdatedSession(state, moved);
    state = withArchivedSession(state, summarize(moved));

    expect(state.activeSessions).toHaveLength(0);
    expect(state.currentSessionId).toBeNull();
    expect(state.sessions[0]?.id).toBe(moved.id);
  });
});
