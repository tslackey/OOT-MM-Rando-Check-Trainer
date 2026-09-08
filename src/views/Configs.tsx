import { useAppState } from "../state/useAppState";
import { deleteConfig, setActiveSession, setView, upsertConfig } from "../state/store";
import { cloneConfig, createSession } from "../lib/session";
import { createConfig, PRESETS } from "../data/presets";
import { enabledChecks } from "../data/world";

export function Configs() {
  const state = useAppState();
  return (
    <div className="page">
      <header className="spread">
        <div>
          <p className="eyebrow">Rando configurations</p>
          <h1>Presets you can reuse</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            const config = createConfig({ name: "Custom preset" });
            upsertConfig(config);
            setView("editor", config.id);
          }}
        >
          New config
        </button>
      </header>
      <ul className="config-list">
        {state.configs.map((config) => {
          const count = enabledChecks(config).length;
          return (
            <li key={config.id} className="card config-row">
              <div>
                <h2>{config.name}</h2>
                <p className="muted">
                  {config.games.oot ? "OoT" : ""}
                  {config.games.oot && config.games.mm ? " + " : ""}
                  {config.games.mm ? "MM" : ""} · {count} checks · +{config.penaltySeconds}s
                  penalties
                </p>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSession(createSession(config));
                    setView("practice");
                  }}
                >
                  Practice
                </button>
                <button type="button" className="ghost" onClick={() => setView("editor", config.id)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => upsertConfig(cloneConfig(config))}
                >
                  Copy
                </button>
                {PRESETS.some((preset) => preset.id === config.id) ? null : (
                  <button type="button" className="ghost danger" onClick={() => deleteConfig(config.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
