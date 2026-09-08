import { PRESETS } from "../data/presets";
import { MAX_ACTIVE_SESSIONS, type PersistedState, type PracticeSession, type RandoConfig } from "../data/types";

export const STORAGE_KEY = "ootmm-check-trainer-v1";

type StoredState = Omit<Partial<PersistedState>, "version"> & {
  version?: number;
  activeSession?: PracticeSession | null;
};

function normalizeSession(session: PracticeSession): PracticeSession {
  return { ...session, wrongIds: session.wrongIds ?? [] };
}

function normalizeConfig(config: RandoConfig): RandoConfig | null {
  if (config.id === "preset-mm-only" || (config.games && !config.games.oot && config.games.mm)) {
    return null;
  }
  return {
    ...config,
    startingItems: config.startingItems ?? [],
    games: { oot: true, mm: false },
    spawn: config.spawn?.startsWith("mm-") ? "auto" : config.spawn,
    name: config.name.replaceAll("OoTMM", "OoT"),
  };
}

export function normalizeState(parsed: StoredState): PersistedState {
  const configs = (parsed.configs ?? [])
    .map(normalizeConfig)
    .filter((config): config is RandoConfig => config !== null);
  for (const preset of PRESETS) {
    if (!configs.some((config) => config.id === preset.id)) {
      configs.push({ ...preset });
    }
  }
  const ids = new Set(configs.map((config) => config.id));
  const fromList = parsed.activeSessions ?? [];
  const fromLegacy = parsed.activeSession && fromList.length === 0 ? [parsed.activeSession] : [];
  const activeSessions = [...fromList, ...fromLegacy].slice(0, MAX_ACTIVE_SESSIONS).map(normalizeSession);
  const currentSessionId =
    parsed.currentSessionId && activeSessions.some((session) => session.id === parsed.currentSessionId)
      ? parsed.currentSessionId
      : (activeSessions[0]?.id ?? null);
  return {
    version: 2,
    configs,
    sessions: parsed.sessions ?? [],
    activeSessions,
    currentSessionId,
    lastConfigId: parsed.lastConfigId && ids.has(parsed.lastConfigId) ? parsed.lastConfigId : PRESETS[0]?.id ?? null,
    defaultConfigId: parsed.defaultConfigId && ids.has(parsed.defaultConfigId) ? parsed.defaultConfigId : null,
    view: parsed.view ?? "home",
    editingConfigId: parsed.editingConfigId ?? null,
  };
}

export function emptyState(): PersistedState {
  return {
    version: 2,
    configs: PRESETS.map((preset) => ({ ...preset })),
    sessions: [],
    activeSessions: [],
    currentSessionId: null,
    lastConfigId: PRESETS[0]?.id ?? null,
    defaultConfigId: null,
    view: "home",
    editingConfigId: null,
  };
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export async function loadState(): Promise<PersistedState> {
  const raw = canUseLocalStorage() ? localStorage.getItem(STORAGE_KEY) : null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredState;
      if (parsed?.version === 1 || parsed?.version === 2) return normalizeState(parsed);
    } catch {
      // fall through to capacitor / empty
    }
  }

  try {
    const { Preferences } = await import("@capacitor/preferences");
    const result = await Preferences.get({ key: STORAGE_KEY });
    if (result.value) {
      const parsed = JSON.parse(result.value) as StoredState;
      if (parsed?.version === 1 || parsed?.version === 2) return normalizeState(parsed);
    }
  } catch {
    // web without native plugin
  }

  return emptyState();
}

export async function saveState(state: PersistedState): Promise<void> {
  const payload = JSON.stringify(state);
  if (canUseLocalStorage()) {
    localStorage.setItem(STORAGE_KEY, payload);
  }
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: STORAGE_KEY, value: payload });
  } catch {
    // web without native plugin
  }
}

export async function hapticPenalty(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // ignore
  }
}

export async function bindAppPause(onPause: () => void): Promise<() => void> {
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("pause", onPause);
    const visibility = () => {
      if (document.visibilityState === "hidden") onPause();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      void handle.remove();
      document.removeEventListener("visibilitychange", visibility);
    };
  } catch {
    const visibility = () => {
      if (document.visibilityState === "hidden") onPause();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }
}
