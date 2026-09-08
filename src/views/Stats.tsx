import { Chart } from "../components/Chart";
import { useAppState } from "../state/useAppState";
import { formatDuration } from "../lib/scoring";
import { setView } from "../state/store";

export function Stats() {
  const state = useAppState();
  const sessions = state.sessions;

  return (
    <div className="page">
      <header className="spread">
        <div>
          <p className="eyebrow">Improvement</p>
          <h1>Attempts over time</h1>
        </div>
        <button type="button" className="ghost" onClick={() => setView("practice")}>
          Back to practice
        </button>
      </header>

      <div className="chart-grid">
        <Chart sessions={sessions} metric="adjustedMs" title="Adjusted time" />
        <Chart sessions={sessions} metric="penalties" title="Penalties" />
        <Chart sessions={sessions} metric="pace" title="Checks per minute" />
        <Chart sessions={sessions} metric="completion" title="Completion %" />
      </div>

      <section className="card">
        <h2>Recent runs</h2>
        {sessions.length === 0 ? (
          <p className="muted">Finish or end a run to store it. Active runs autosave separately.</p>
        ) : (
          <ol className="history">
            {sessions.slice(0, 20).map((session) => (
              <li key={session.id}>
                <strong>{session.configName}</strong>
                <span>
                  {session.collected}/{session.total} · {formatDuration(session.adjustedMs)} ·{" "}
                  {session.penalties} penalties
                  {session.completed ? " · clear" : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
