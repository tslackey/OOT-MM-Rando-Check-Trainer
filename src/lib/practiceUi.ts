import type { Connection, PracticeSession, RandoConfig, Warp, WorldCheck } from "../data/types";
import {
  ageOk,
  allOutgoing,
  availableWarps,
  canUseConnection,
  checkInLogic,
  itemLabel,
  REGION_BY_ID,
  sessionEvents,
  WORLD,
} from "../data/world";

export type PracticeTab = "location" | "inventory" | "warp";

export type SpecialWarpId = "respawn" | "farores-set" | "farores-return" | "farores-clear";

export interface SpecialWarp {
  id: SpecialWarpId;
  label: string;
}

const HIDDEN_INVENTORY = new Set(["cross_game"]);

const SONG_ITEMS = new Set([
  "song_of_time",
  "song_of_storms",
  "saria",
  "epona",
  "suns_song",
  "zelda_lullaby",
  "minuet",
  "bolero",
  "serenade",
  "nocturne",
  "requiem",
  "prelude",
]);

const REWARD_ITEMS = new Set([
  "kokiri_emerald",
  "goron_ruby",
  "zora_sapphire",
  "forest_medallion",
  "fire_medallion",
  "water_medallion",
  "shadow_medallion",
  "spirit_medallion",
  "light_medallion",
]);

export function visibleRegionChecks(session: PracticeSession, config?: RandoConfig): WorldCheck[] {
  const collected = new Set(session.collectedCheckIds);
  const events = sessionEvents(session.collectedCheckIds, session.logicEvents ?? []);
  return WORLD.checks.filter((check) => {
    if (check.regionId !== session.currentRegionId) return false;
    if (!session.enabledCheckIds.includes(check.id)) return false;
    if (!ageOk(check.age, session.age)) return false;
    if (collected.has(check.id)) return false;
    if (
      config?.hideLocked &&
      !checkInLogic(check, session.inventory, session.age, session.currentRegionId, config, events)
    ) {
      return false;
    }
    return true;
  });
}

export function visibleExits(session: PracticeSession, config: RandoConfig): Connection[] {
  const events = sessionEvents(session.collectedCheckIds, session.logicEvents ?? []);
  const exits = allOutgoing(session.currentRegionId, config.games).filter((connection) => {
    if (!ageOk(connection.age, session.age)) return false;
    if (config.hideLocked && !canUseConnection(connection, session.inventory, session.age, config, events)) {
      return false;
    }
    return true;
  });
  return [...new Map(exits.map((connection) => [connection.to, connection])).values()];
}

export function visibleWarps(session: PracticeSession, config: RandoConfig): Warp[] {
  return availableWarps(session.inventory).filter((warp) => {
    const dest = REGION_BY_ID[warp.regionId];
    if (dest && !config.games[dest.game]) return false;
    return true;
  });
}

export function specialWarps(session: PracticeSession): SpecialWarp[] {
  const spawnId = session.age === "adult" ? session.adultSpawnId : session.childSpawnId;
  const spawnName = REGION_BY_ID[spawnId]?.name ?? "spawn";
  const warps: SpecialWarp[] = [{ id: "respawn", label: `Respawn (${spawnName})` }];
  if (session.inventory.includes("farores")) {
    warps.push({ id: "farores-set", label: "Set Farore's Wind" });
    if (session.faroresRegionId) {
      const point = REGION_BY_ID[session.faroresRegionId]?.name ?? session.faroresRegionId;
      warps.push({ id: "farores-return", label: `Farore's Wind (${point})` });
      warps.push({ id: "farores-clear", label: "Clear Farore's Wind" });
    }
  }
  return warps;
}

export function canShowWarpTab(session: PracticeSession, config: RandoConfig): boolean {
  return specialWarps(session).length > 0 || visibleWarps(session, config).length > 0;
}

export function visibleInventory(inventory: string[]): string[] {
  return inventory.filter((item) => !item.startsWith("open_") && !HIDDEN_INVENTORY.has(item));
}

export function inventoryGroups(inventory: string[]): { title: string; items: { id: string; count: number }[] }[] {
  const groups: Record<string, { id: string; count: number }[]> = {
    Equipment: [],
    Songs: [],
    Rewards: [],
  };
  const seen = new Map<string, { id: string; count: number }>();
  for (const item of visibleInventory(inventory)) {
    const existing = seen.get(item);
    if (existing) {
      existing.count += 1;
      continue;
    }
    const entry = { id: item, count: 1 };
    seen.set(item, entry);
    if (SONG_ITEMS.has(item)) groups.Songs.push(entry);
    else if (REWARD_ITEMS.has(item)) groups.Rewards.push(entry);
    else groups.Equipment.push(entry);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length)
    .map(([title, items]) => ({ title, items }));
}

export function isWrong(session: PracticeSession, id: string): boolean {
  return (session.wrongIds ?? []).includes(id);
}

export function labeledItem(id: string): string {
  return itemLabel(id);
}
