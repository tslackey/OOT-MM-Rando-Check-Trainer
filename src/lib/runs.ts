import { MAX_ACTIVE_SESSIONS, type PersistedState, type PracticeSession, type SessionSummary } from "../data/types";
import { togglePause } from "./session";

function pauseIfRunning(session: PracticeSession): PracticeSession {
  if (session.finishedAt || session.pausedAt) return session;
  return togglePause(session);
}

export function currentSession(state: PersistedState): PracticeSession | null {
  return state.activeSessions.find((session) => session.id === state.currentSessionId) ?? null;
}

export function canStartSession(state: PersistedState): boolean {
  return state.activeSessions.length < MAX_ACTIVE_SESSIONS;
}

function pickCurrentId(sessions: PracticeSession[], previousId: string | null, removedId: string): string | null {
  if (previousId !== removedId) return previousId;
  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)[0]?.id ?? null;
}

export function withStartedSession(state: PersistedState, session: PracticeSession): PersistedState {
  if (!canStartSession(state)) return state;
  return {
    ...state,
    activeSessions: [
      ...state.activeSessions.map((entry) =>
        entry.id === state.currentSessionId ? pauseIfRunning(entry) : entry,
      ),
      session,
    ],
    currentSessionId: session.id,
    lastConfigId: session.configId,
  };
}

export function withUpdatedSession(state: PersistedState, session: PracticeSession): PersistedState {
  if (!state.activeSessions.some((entry) => entry.id === session.id)) return state;
  return {
    ...state,
    activeSessions: state.activeSessions.map((entry) => (entry.id === session.id ? session : entry)),
    currentSessionId: session.id,
    lastConfigId: session.configId,
  };
}

export function withReplacedCurrentSession(state: PersistedState, session: PracticeSession): PersistedState {
  if (!state.currentSessionId) return withStartedSession(state, session);
  return {
    ...state,
    activeSessions: state.activeSessions.map((entry) => (entry.id === state.currentSessionId ? session : entry)),
    currentSessionId: session.id,
    lastConfigId: session.configId,
  };
}

export function withResumedSession(state: PersistedState, id: string): PersistedState {
  if (!state.activeSessions.some((entry) => entry.id === id)) return state;
  return {
    ...state,
    activeSessions: state.activeSessions.map((entry) => {
      if (entry.id === id) return entry;
      if (entry.id === state.currentSessionId) return pauseIfRunning(entry);
      return entry;
    }),
    currentSessionId: id,
    view: "practice",
  };
}

export function withDeletedActiveSession(state: PersistedState, id: string): PersistedState {
  const activeSessions = state.activeSessions.filter((entry) => entry.id !== id);
  return {
    ...state,
    activeSessions,
    currentSessionId: pickCurrentId(activeSessions, state.currentSessionId, id),
  };
}

export function withArchivedSession(state: PersistedState, summary: SessionSummary): PersistedState {
  const next = withDeletedActiveSession(state, summary.id);
  return {
    ...next,
    sessions: [summary, ...next.sessions].slice(0, 200),
  };
}

export function sortedActiveSessions(state: PersistedState): PracticeSession[] {
  return [...state.activeSessions].sort((left, right) => right.updatedAt - left.updatedAt);
}
