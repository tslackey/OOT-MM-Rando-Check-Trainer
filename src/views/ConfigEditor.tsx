import { CHECK_TYPES } from "../data/types";
import type { RandoConfig } from "../data/types";
import { WORLD, itemLabel } from "../data/world";
import { useAppState } from "../state/useAppState";
import { setDefaultConfigId, setView, upsertConfig } from "../state/store";
import { downloadText, exportRandoFile } from "../lib/importRando";

export function ConfigEditor() {
  const state = useAppState();
  const config = state.configs.find((entry) => entry.id === state.editingConfigId);
  const isDefault = Boolean(config && state.defaultConfigId === config.id);

  if (!config) {
    return (
      <div className="page">
        <p>Select a configuration to edit.</p>
        <button type="button" onClick={() => setView("configs")}>
          Back to configs
        </button>
      </div>
    );
  }

  const update = (patch: Partial<RandoConfig>) => {
    upsertConfig({ ...config, ...patch });
  };

  const spawnOptions = WORLD.regions.filter((region) => region.game === "oot" && region.hub);

  const settingEntries = Object.entries(config.randoSettings ?? {});

  return (
    <div className="page">
      <header className="spread">
        <div>
          <p className="eyebrow">Edit configuration</p>
          <h1>{config.name}</h1>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => setDefaultConfigId(isDefault ? null : config.id)}
          >
            {isDefault ? "Clear default" : "Set as default"}
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
          <button type="button" className="ghost" onClick={() => setView("configs")}>
            Done
          </button>
        </div>
      </header>

      <label className="field">
        Name
        <input value={config.name} onChange={(event) => update({ name: event.target.value })} />
      </label>

      {config.randoSettings || config.importSummary ? (
        <section className="card">
          <p className="eyebrow">Imported rando file</p>
          <p>
            {config.randoVersion || "Settings JSON"}
            {config.randoSeed ? ` · seed ${config.randoSeed}` : ""}
            {config.sourceFileName ? ` · ${config.sourceFileName}` : ""}
          </p>
          {config.importSummary ? <p className="muted">{config.importSummary}</p> : null}
          {config.startingItems?.length ? (
            <div className="inventory">
              {config.startingItems.map((item) => (
                <span key={item} className="chip">
                  {itemLabel(item)}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No starting items besides world flags.</p>
          )}
          {settingEntries.length ? (
            <details>
              <summary>Original settings ({settingEntries.length}) — used as generation defaults</summary>
              <dl className="settings-list">
                {settingEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="card">
        <p className="eyebrow">Game</p>
        <p>Ocarina of Time only. Majora's Mask will be a separate trainer later.</p>
      </section>

      <fieldset className="card">
        <legend>Check types</legend>
        {CHECK_TYPES.map((entry) => (
          <label key={entry.id}>
            <input
              type="checkbox"
              checked={config.checkTypes[entry.id]}
              onChange={(event) =>
                update({
                  checkTypes: { ...config.checkTypes, [entry.id]: event.target.checked },
                })
              }
            />
            {entry.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="card">
        <legend>World</legend>
        <label>
          Starting age
          <select
            value={config.startingAge}
            onChange={(event) => update({ startingAge: event.target.value as RandoConfig["startingAge"] })}
          >
            <option value="child">Child</option>
            <option value="adult">Adult</option>
          </select>
        </label>
        <label>
          Spawn
          <select value={config.spawn} onChange={(event) => update({ spawn: event.target.value })}>
            <option value="auto">Auto</option>
            {spawnOptions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.openForest}
            onChange={(event) => update({ openForest: event.target.checked })}
          />
          Open forest
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.openDeku}
            onChange={(event) => update({ openDeku: event.target.checked })}
          />
          Open Deku Tree
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.openZora}
            onChange={(event) => update({ openZora: event.target.checked })}
          />
          Open Zora's Domain
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.openDoorOfTime}
            onChange={(event) => update({ openDoorOfTime: event.target.checked })}
          />
          Open Door of Time
        </label>
      </fieldset>

      <fieldset className="card">
        <legend>Training</legend>
        <label>
          Invalid action penalty (seconds)
          <input
            type="number"
            min={0}
            value={config.penaltySeconds}
            onChange={(event) => update({ penaltySeconds: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          Tracker peek penalty (seconds)
          <input
            type="number"
            min={0}
            value={config.peekPenaltySeconds}
            onChange={(event) => update({ peekPenaltySeconds: Number(event.target.value) || 0 })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.hideCompleted}
            onChange={(event) => update({ hideCompleted: event.target.checked })}
          />
          Hide completed checks (easier)
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.hideLocked}
            onChange={(event) => update({ hideLocked: event.target.checked })}
          />
          Hide locked paths (easier)
        </label>
      </fieldset>
    </div>
  );
}
