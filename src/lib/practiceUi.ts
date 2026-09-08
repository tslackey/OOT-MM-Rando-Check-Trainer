import type { Connection, PracticeSession, RandoConfig, Warp, WorldCheck } from "../data/types";
import {
  ageOk,
  allOutgoing,
  availableWarps,
  canUseConnection,
  itemLabel,
  REGION_BY_ID,
  WORLD,
} from "../data/world";

export type PracticeTab = "location" | "inventory" | "warp";

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

export function visibleRegionChecks(session: PracticeSession): WorldCheck[] {
  const collected = new Set(session.collectedCheckIds);
  return WORLD.checks.filter((check) => {
    if (check.regionId !== session.currentRegionId) return false;
    if (!session.enabledCheckIds.includes(check.id)) return false;
    if (!ageOk(check.age, session.age)) return false;
    if (collected.has(check.id)) return false;
    return true;
  });
}

export function visibleExits(session: PracticeSession, config: RandoConfig): Connection[] {
  const exits = allOutgoing(session.currentRegionId, config.games).filter((connection) => {
    if (!ageOk(connection.age, session.age)) return false;
    if (config.hideLocked && !canUseConnection(connection, session.inventory, session.age)) return false;
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

export function canShowWarpTab(session: PracticeSession, config: RandoConfig): boolean {
  return visibleWarps(session, config).length > 0;
}

export function visibleInventory(inventory: string[]): string[] {
  return inventory.filter((item) => !item.startsWith("open_") && !HIDDEN_INVENTORY.has(item));
}

export function inventoryGroups(inventory: string[]): { title: string; items: string[] }[] {
  const groups: Record<string, string[]> = {
    Equipment: [],
    Songs: [],
    Rewards: [],
  };
  for (const item of visibleInventory(inventory)) {
    if (SONG_ITEMS.has(item)) groups.Songs.push(item);
    else if (REWARD_ITEMS.has(item)) groups.Rewards.push(item);
    else groups.Equipment.push(item);
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
