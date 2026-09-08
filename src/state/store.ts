import type { PersistedState, PracticeSession, RandoConfig, SessionSummary, ViewId } from "../data/types";
import { bindAppPause, emptyState, loadState, saveState } from "../storage/persist";

type Listener = () => void;

let state: PersistedState = emptyState();
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState(state);
  }, 80);
}

export function getState(): PersistedState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(patch: Partial<PersistedState> | ((current: PersistedState) => PersistedState)): void {
  state = typeof patch === "function" ? patch(state) : { ...state, ...patch };
  emit();
  scheduleSave();
}

export function setView(view: ViewId, editingConfigId: string | null = state.editingConfigId): void {
  setState({ view, editingConfigId });
}

export function upsertConfig(config: RandoConfig): void {
  setState((current) => {
    const exists = current.configs.some((entry) => entry.id === config.id);
    const configs = exists
      ? current.configs.map((entry) => (entry.id === config.id ? { ...config, updatedAt: Date.now() } : entry))
      : [...current.configs, { ...config, updatedAt: Date.now() }];
    return { ...current, configs, lastConfigId: config.id };
  });
}

export function deleteConfig(id: string): void {
  setState((current) => ({
    ...current,
    configs: current.configs.filter((entry) => entry.id !== id),
    lastConfigId: current.lastConfigId === id ? (current.configs.find((entry) => entry.id !== id)?.id ?? null) : current.lastConfigId,
    defaultConfigId: current.defaultConfigId === id ? null : current.defaultConfigId,
  }));
}

export function setDefaultConfigId(id: string | null): void {
  setState({ defaultConfigId: id, lastConfigId: id ?? state.lastConfigId });
}

export function setActiveSession(session: PracticeSession | null): void {
  setState({ activeSession: session, lastConfigId: session?.configId ?? state.lastConfigId });
}

export function archiveSession(summary: SessionSummary): void {
  setState((current) => ({
    ...current,
    sessions: [summary, ...current.sessions].slice(0, 200),
    activeSession: null,
  }));
}

export function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  void saveState(state);
}

export async function bootStore(): Promise<void> {
  if (loaded) return;
  state = await loadState();
  loaded = true;
  emit();
  await bindAppPause(() => {
    flushSave();
  });
}
