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

export function trainingDefaults(from?: RandoConfig): Pick<
  RandoConfig,
  "penaltySeconds" | "peekPenaltySeconds" | "hideCompleted" | "hideLocked"
> {
  return {
    penaltySeconds: from?.penaltySeconds ?? 15,
    peekPenaltySeconds: from?.peekPenaltySeconds ?? 45,
    hideCompleted: from?.hideCompleted ?? false,
    hideLocked: from?.hideLocked ?? false,
  };
}

export function createConfig(partial: Partial<RandoConfig> = {}, defaults?: RandoConfig): RandoConfig {
  const now = Date.now();
  const training = trainingDefaults(defaults);
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? "New preset",
    updatedAt: now,
    games: { oot: true, mm: false },
    checkTypes: { ...ALL_TYPES, ...partial.checkTypes },
    startingAge: partial.startingAge ?? "child",
    openForest: partial.openForest ?? true,
    openDeku: partial.openDeku ?? true,
    openZora: partial.openZora ?? true,
    openDoorOfTime: partial.openDoorOfTime ?? true,
    penaltySeconds: partial.penaltySeconds ?? training.penaltySeconds,
    peekPenaltySeconds: partial.peekPenaltySeconds ?? training.peekPenaltySeconds,
    hideCompleted: partial.hideCompleted ?? training.hideCompleted,
    hideLocked: partial.hideLocked ?? training.hideLocked,
    spawn: partial.spawn ?? "auto",
    startingItems: partial.startingItems ?? [],
    randoVersion: partial.randoVersion,
    randoSeed: partial.randoSeed,
    randoSettings: partial.randoSettings,
    importedPlacement: partial.importedPlacement,
    importedCheckIds: partial.importedCheckIds,
    importSummary: partial.importSummary,
    sourceFileName: partial.sourceFileName,
  };
}

export const PRESETS: RandoConfig[] = [
  createConfig({
    id: "preset-oot-standard",
    name: "OoT standard",
    games: { oot: true, mm: false },
    checkTypes: { ...ALL_TYPES },
    spawn: "oot-kokiri",
  }),
  createConfig({
    id: "preset-oot-songs",
    name: "OoT song memory",
    games: { oot: true, mm: false },
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
    spawn: "oot-kokiri",
  }),
  createConfig({
    id: "preset-oot-dungeons",
    name: "OoT dungeon checks",
    games: { oot: true, mm: false },
    checkTypes: {
      chest: true,
      song: false,
      dungeonReward: true,
      scrub: false,
      shop: false,
      trade: false,
      skullReward: false,
    },
    spawn: "oot-kokiri",
  }),
];
