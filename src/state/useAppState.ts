import { useSyncExternalStore } from "react";
import { getState, subscribe } from "../state/store";
import type { PersistedState } from "../data/types";

export function useAppState(): PersistedState {
  return useSyncExternalStore(subscribe, getState, getState);
}
