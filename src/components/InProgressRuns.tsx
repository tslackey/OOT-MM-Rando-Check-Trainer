import { MAX_ACTIVE_SESSIONS } from "../data/types";
import { REGION_BY_ID } from "../data/world";
import { formatDuration, sessionElapsedMs } from "../lib/scoring";
import { sortedActiveSessions } from "../lib/runs";
import { deleteActiveSession, resumeSession } from "../state/store";
import { useAppState } from "../state/useAppState";

export function InProgressRuns() {
  const state = useAppState();
  const runs = sortedActiveSessions(state);
  if (runs.length === 0) return null;

  return (
    <section className="run-list">
      <p className="eyebrow">
        In progress · {runs.length}/{MAX_ACTIVE_SESSIONS}
      </p>
      {runs.map((run) => (
        <article key={run.id} className="card resume">
          <div>
            <h2>{run.configName}</h2>
            <p className="muted">
              {REGION_BY_ID[run.currentRegionId]?.name} · {run.age} · {run.collectedCheckIds.length}/
              {run.enabledCheckIds.length} checks · {formatDuration(sessionElapsedMs(run))}
              {run.pausedAt ? " · paused" : ""}
            </p>
          </div>
          <div className="row-actions">
            <button type="button" onClick={() => resumeSession(run.id)}>
              Resume
            </button>
            <button type="button" className="ghost danger" onClick={() => deleteActiveSession(run.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
