import type { CheckType, RandoConfig } from "./types";

const ALL_TYPES: Record<CheckType, boolean> = {
  chest: true,
  song: true,
  dungeonReward: true,
  scrub: true,
  shop: false,
  trade: true,
  skullReward: false,
};

export function createConfig(partial: Partial<RandoConfig> = {}): RandoConfig {
  const now = Date.now();
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? "New preset",
    updatedAt: now,
    games: partial.games ?? { oot: true, mm: true },
    checkTypes: { ...ALL_TYPES, ...partial.checkTypes },
    startingAge: partial.startingAge ?? "child",
    openForest: partial.openForest ?? true,
    openDeku: partial.openDeku ?? true,
    openZora: partial.openZora ?? true,
    openDoorOfTime: partial.openDoorOfTime ?? true,
    penaltySeconds: partial.penaltySeconds ?? 15,
    peekPenaltySeconds: partial.peekPenaltySeconds ?? 45,
    hideCompleted: partial.hideCompleted ?? false,
    hideLocked: partial.hideLocked ?? false,
    spawn: partial.spawn ?? "auto",
  };
}

export const PRESETS: RandoConfig[] = [
  createConfig({
    id: "preset-ootmm-standard",
    name: "OoTMM standard",
    games: { oot: true, mm: true },
    checkTypes: { ...ALL_TYPES },
  }),
  createConfig({
    id: "preset-oot-only",
    name: "OoT only",
    games: { oot: true, mm: false },
    checkTypes: { ...ALL_TYPES, shop: false, skullReward: false },
    spawn: "oot-kokiri",
  }),
  createConfig({
    id: "preset-mm-only",
    name: "MM only",
    games: { oot: false, mm: true },
    checkTypes: { ...ALL_TYPES, trade: false, skullReward: false },
    spawn: "mm-sct",
  }),
  createConfig({
    id: "preset-songs",
    name: "Song memory drill",
    games: { oot: true, mm: true },
    checkTypes: {
      chest: false,
      song: true,
      dungeonReward: false,
      scrub: false,
      shop: false,
      trade: false,
      skullReward: false,
    },
    penaltySeconds: 10,
  }),
  createConfig({
    id: "preset-dungeons",
    name: "Dungeon checks",
    games: { oot: true, mm: true },
    checkTypes: {
      chest: true,
      song: false,
      dungeonReward: true,
      scrub: false,
      shop: false,
      trade: false,
      skullReward: false,
    },
  }),
];
