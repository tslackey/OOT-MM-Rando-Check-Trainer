import { useRef, useState } from "react";
import { useAppState } from "../state/useAppState";
import { deleteConfig, setDefaultConfigId, setView, startSession, upsertConfig } from "../state/store";
import { cloneConfig, createSession } from "../lib/session";
import { canStartSession } from "../lib/runs";
import { MAX_ACTIVE_SESSIONS } from "../data/types";
import { createConfig, PRESETS } from "../data/presets";
import { enabledChecks } from "../data/world";
import { downloadText, exportRandoFile, ImportError, importRandoFile } from "../lib/importRando";

export function Configs() {
  const state = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [makeDefault, setMakeDefault] = useState(!state.defaultConfigId);
  const defaults = state.configs.find((config) => config.id === state.defaultConfigId);

  return (
    <div className="page">
      <header className="spread">
        <div>
          <p className="eyebrow">Rando configurations</p>
          <h1>Presets you can reuse</h1>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => inputRef.current?.click()}
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={() => {
              const config = createConfig({ name: "Custom preset" }, defaults);
              upsertConfig(config);
              setView("editor", config.id);
            }}
          >
            New config
          </button>
        </div>
      </header>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void file
            .text()
            .then((text) => {
              const result = importRandoFile(text, file.name, defaults);
              upsertConfig(result.config);
              if (makeDefault || !state.defaultConfigId) {
                setDefaultConfigId(result.config.id);
              }
              setError(null);
              setNotice(
                `Imported ${result.config.name}. ${result.totalLocations ? result.config.importSummary : "Settings stored as generation defaults."}`,
              );
              setView("editor", result.config.id);
            })
            .catch((err: unknown) => {
              setNotice(null);
              setError(err instanceof ImportError ? err.message : "Could not import that JSON file.");
            });
        }}
      />

      <label className="inline">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(event) => setMakeDefault(event.target.checked)}
        />
        Set the next import as my default generation preset
      </label>

      {error ? <p className="flash bad">{error}</p> : null}
      {notice ? <p className="flash ok">{notice}</p> : null}

      <p className="muted">
        Import an OoT Randomizer spoiler or settings JSON. Locations become the seed's item
        placement; <code>Child Spawn</code> / <code>Adult Spawn</code> in <code>entrancesMap</code>{" "}
        set save-warp points. Practice then generates a spoiler from the config (or keeps the
        imported one).
      </p>
      {canStartSession(state) ? null : (
        <p className="muted">
          You already have {MAX_ACTIVE_SESSIONS} runs in progress. Resume or delete one on Home
          before starting another.
        </p>
      )}

      <ul className="config-list">
        {state.configs.map((config) => {
          const count = enabledChecks(config).length;
          const isDefault = state.defaultConfigId === config.id;
          return (
            <li key={config.id} className="card config-row">
              <div>
                <h2>
                  {config.name}
                  {isDefault ? <span className="chip">Default</span> : null}
                </h2>
                <p className="muted">
                  OoT · {count} checks · +{config.penaltySeconds}s penalties
                  {config.randoSeed ? ` · seed ${config.randoSeed}` : ""}
                </p>
                {config.importSummary ? <p className="muted">{config.importSummary}</p> : null}
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  disabled={!canStartSession(state)}
                  onClick={() => {
                    if (startSession(createSession(config))) setView("practice");
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
                  onClick={() => setDefaultConfigId(isDefault ? null : config.id)}
                >
                  {isDefault ? "Clear default" : "Set default"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    downloadText(
                      `${config.name.replace(/[^\w.-]+/g, "-").toLowerCase()}.json`,
                      exportRandoFile(config),
                    )
                  }
                >
                  Export JSON
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
