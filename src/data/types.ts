export type GameId = "oot" | "mm";
export type Age = "child" | "adult" | "any";
export type CheckType =
  | "chest"
  | "song"
  | "dungeonReward"
  | "scrub"
  | "shop"
  | "trade"
  | "skullReward";

export type ViewId = "home" | "configs" | "editor" | "practice" | "stats";

export interface Region {
  id: string;
  name: string;
  game: GameId;
  hub?: boolean;
  dungeon?: boolean;
}

export interface Connection {
  from: string;
  to: string;
  needs: string[];
  age: Age;
}

export interface Warp {
  item: string;
  regionId: string;
  label: string;
}

export interface WorldCheck {
  id: string;
  name: string;
  game: GameId;
  regionId: string;
  type: CheckType;
  age: Age;
  needs: string[];
  ootrLocation?: string;
}

export interface WorldData {
  regions: Region[];
  connections: Connection[];
  warps: Warp[];
  checks: WorldCheck[];
  itemPool: {
    progression: string[];
    junk: string[];
  };
}

export const CHECK_TYPES: { id: CheckType; label: string }[] = [
  { id: "chest", label: "Chests & NPCs" },
  { id: "song", label: "Songs" },
  { id: "dungeonReward", label: "Dungeon rewards" },
  { id: "scrub", label: "Business scrubs" },
  { id: "shop", label: "Shops" },
  { id: "trade", label: "Trade quests" },
  { id: "skullReward", label: "Skulltula house" },
];

export interface RandoConfig {
  id: string;
  name: string;
  updatedAt: number;
  games: { oot: boolean; mm: boolean };
  checkTypes: Record<CheckType, boolean>;
  startingAge: Exclude<Age, "any">;
  openForest: boolean;
  openDeku: boolean;
  openZora: boolean;
  openDoorOfTime: boolean;
  penaltySeconds: number;
  peekPenaltySeconds: number;
  hideCompleted: boolean;
  hideLocked: boolean;
  spawn: "auto" | string;
  childSpawn: "auto" | string;
  adultSpawn: "auto" | string;
  spawnShuffle: boolean;
  randomStartingAge: boolean;
  startingItems: string[];
  randoVersion?: string;
  randoSeed?: string;
  randoSettings?: Record<string, string>;
  importedPlacement?: Record<string, string>;
  importedCheckIds?: string[];
  importedEntrances?: Record<string, string>;
  importSummary?: string;
  sourceFileName?: string;
}

export interface ActionEvent {
  at: number;
  kind: "travel" | "check" | "warp" | "peek" | "pause" | "resume" | "finish";
  label: string;
  ok: boolean;
  reason?: string;
  regionId?: string;
  checkId?: string;
  item?: string;
}

export interface PracticeSession {
  id: string;
  configId: string;
  configName: string;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  pausedAt?: number;
  pausedMs: number;
  currentRegionId: string;
  age: Exclude<Age, "any">;
  childSpawnId: string;
  adultSpawnId: string;
  faroresRegionId?: string | null;
  seed: number;
  inventory: string[];
  collectedCheckIds: string[];
  wrongIds: string[];
  placement: Record<string, string>;
  enabledCheckIds: string[];
  log: ActionEvent[];
  penalties: number;
  penaltySeconds: number;
  peekUsed: number;
  lastFlash?: { tone: "ok" | "bad"; text: string; at: number };
  logicEvents?: string[];
}

export interface SessionSummary {
  id: string;
  configId: string;
  configName: string;
  startedAt: number;
  finishedAt: number;
  elapsedMs: number;
  adjustedMs: number;
  collected: number;
  total: number;
  penalties: number;
  peekUsed: number;
  completed: boolean;
}

export const MAX_ACTIVE_SESSIONS = 3;

export interface PersistedState {
  version: 2;
  configs: RandoConfig[];
  sessions: SessionSummary[];
  activeSessions: PracticeSession[];
  currentSessionId: string | null;
  lastConfigId: string | null;
  defaultConfigId: string | null;
  view: ViewId;
  editingConfigId: string | null;
}
