import { InProgressRuns } from "../components/InProgressRuns";
import { MAX_ACTIVE_SESSIONS } from "../data/types";
import { createSession } from "../lib/session";
import { canStartSession } from "../lib/runs";
import { formatDuration } from "../lib/scoring";
import { startSession, setView } from "../state/store";
import { useAppState } from "../state/useAppState";

export function Home() {
  const state = useAppState();
  const last =
    state.configs.find((config) => config.id === state.defaultConfigId) ??
    state.configs.find((config) => config.id === state.lastConfigId) ??
    state.configs[0];
  const atCap = !canStartSession(state);
  const recent = state.sessions[0];

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">OoT check trainer</p>
        <h1>Play the route. Do not open a tracker.</h1>
        <p>
          Save a rando configuration, then tap <strong>Go to</strong> buttons like you would walk the
          world. Invalid travels and checks cost time. Everything autosaves so you can put the phone
          down mid-run.
        </p>
      </header>

      <InProgressRuns />

      <section className="actions">
        <button
          type="button"
          disabled={!last || atCap}
          onClick={() => {
            if (!last) return;
            if (startSession(createSession(last))) setView("practice");
          }}
        >
          Start {last ? last.name : "a config"}
        </button>
        <button type="button" className="ghost" onClick={() => setView("configs")}>
          Import / configure presets
        </button>
      </section>
      {atCap ? (
        <p className="muted">
          You can keep {MAX_ACTIVE_SESSIONS} runs in progress. Resume or delete one to start another.
        </p>
      ) : null}

      {recent ? (
        <section className="card">
          <p className="eyebrow">Last finished attempt</p>
          <h2>{recent.configName}</h2>
          <p>
            {recent.collected}/{recent.total} checks in {formatDuration(recent.adjustedMs)} adjusted
            ({recent.penalties} penalties)
          </p>
        </section>
      ) : (
        <section className="card">
          <p className="eyebrow">How it scores</p>
          <ul className="plain">
            <li>Travel with Go to Kokiri Forest, Go to Kakariko, and the rest of the map buttons.</li>
            <li>Tapping a locked path, a collected check, or an out-of-logic chest is a penalty.</li>
            <li>Peek remaining checks if you are stuck — it is treated as opening a tracker.</li>
          </ul>
        </section>
      )}
    </div>
  );
}
