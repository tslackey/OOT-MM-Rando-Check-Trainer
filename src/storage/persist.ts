import type { PersistedState } from "../data/types";
import { PRESETS } from "../data/presets";

export const STORAGE_KEY = "ootmm-check-trainer-v1";

export function emptyState(): PersistedState {
  return {
    version: 1,
    configs: PRESETS.map((preset) => ({ ...preset })),
    sessions: [],
    activeSession: null,
    lastConfigId: PRESETS[0]?.id ?? null,
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
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed?.version === 1) return parsed;
    } catch {
      // fall through to capacitor / empty
    }
  }

  try {
    const { Preferences } = await import("@capacitor/preferences");
    const result = await Preferences.get({ key: STORAGE_KEY });
    if (result.value) {
      const parsed = JSON.parse(result.value) as PersistedState;
      if (parsed?.version === 1) return parsed;
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
