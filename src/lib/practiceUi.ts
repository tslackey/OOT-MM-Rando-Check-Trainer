import type { Connection, PracticeSession, RandoConfig, Warp, WorldCheck } from "../data/types";
import {
  ageOk,
  allOutgoing,
  adultAvailable,
  availableWarps,
  canUseConnection,
  checkInLogic,
  isJunkItem,
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

export type InventoryGroupTitle = "Items" | "Equipment" | "Songs" | "Keys" | "Quest";

const GROUP_ORDER: InventoryGroupTitle[] = ["Items", "Equipment", "Songs", "Keys", "Quest"];

/** C-button / Select Item screen, left-to-right then top-to-bottom. */
const ITEM_ORDER = [
  "sticks",
  "nuts",
  "bombs",
  "bow",
  "fire_arrows",
  "dins",
  "slingshot",
  "ocarina",
  "bombchu",
  "hookshot",
  "longshot",
  "ice_arrows",
  "farores",
  "boomerang",
  "lens",
  "beans",
  "hammer",
  "light_arrows",
  "nayrus",
  "bottle",
  "skull_mask",
  "mask_of_truth",
];

/** Swords, shields, boots, then strength / scale / magic upgrades. */
const EQUIPMENT_ORDER = [
  "kokiri_sword",
  "master_sword",
  "biggoron_sword",
  "deku_shield",
  "hylian_shield",
  "mirror_shield",
  "kokiri_tunic",
  "goron_tunic",
  "zora_tunic",
  "kokiri_boots",
  "iron_boots",
  "hover_boots",
  "strength",
  "silver_gauntlets",
  "golden_gauntlets",
  "silver_scale",
  "golden_scale",
  "magic",
];

/** Quest-status song rows: child songs, then warp songs. */
const SONG_ORDER = [
  "zelda_lullaby",
  "epona",
  "saria",
  "suns_song",
  "song_of_time",
  "song_of_storms",
  "minuet",
  "bolero",
  "serenade",
  "requiem",
  "nocturne",
  "prelude",
];

const QUEST_ORDER = [
  "kokiri_emerald",
  "goron_ruby",
  "zora_sapphire",
  "forest_medallion",
  "fire_medallion",
  "water_medallion",
  "shadow_medallion",
  "spirit_medallion",
  "light_medallion",
  "gerudo_card",
  "gs_tokens",
];

const SONG_ITEMS = new Set(SONG_ORDER);
const EQUIPMENT_ITEMS = new Set(EQUIPMENT_ORDER);
const QUEST_ITEMS = new Set(QUEST_ORDER);
const ITEM_ITEMS = new Set(ITEM_ORDER);

const DUNGEON_KEY_ORDER = [
  "forest",
  "fire",
  "water",
  "shadow",
  "spirit",
  "well",
  "bottom_of_the_well",
  "gtg",
  "gerudo_training",
  "ganon",
  "hideout",
  "treasure",
];

function isKeyItem(id: string): boolean {
  return (
    id.startsWith("small_key_") ||
    id.startsWith("boss_key_") ||
    id === "hideout_small_key" ||
    id.startsWith("key_ring_")
  );
}

function orderIndex(id: string, order: readonly string[]): number {
  const index = order.indexOf(id);
  return index === -1 ? 1000 : index;
}

function keySortIndex(id: string): number {
  const dungeon = DUNGEON_KEY_ORDER.findIndex((token) => id.includes(token));
  const dungeonIdx = dungeon === -1 ? 99 : dungeon;
  const isBoss = id.startsWith("boss_key_") ? 1 : 0;
  return dungeonIdx * 2 + isBoss;
}

function classifyItem(id: string): InventoryGroupTitle {
  if (SONG_ITEMS.has(id)) return "Songs";
  if (isKeyItem(id)) return "Keys";
  if (QUEST_ITEMS.has(id)) return "Quest";
  if (EQUIPMENT_ITEMS.has(id)) return "Equipment";
  if (ITEM_ITEMS.has(id)) return "Items";
  return "Items";
}

function sortGroup(title: InventoryGroupTitle, items: { id: string; count: number }[]): { id: string; count: number }[] {
  return [...items].sort((left, right) => {
    let delta = 0;
    if (title === "Songs") delta = orderIndex(left.id, SONG_ORDER) - orderIndex(right.id, SONG_ORDER);
    else if (title === "Equipment") delta = orderIndex(left.id, EQUIPMENT_ORDER) - orderIndex(right.id, EQUIPMENT_ORDER);
    else if (title === "Quest") delta = orderIndex(left.id, QUEST_ORDER) - orderIndex(right.id, QUEST_ORDER);
    else if (title === "Keys") delta = keySortIndex(left.id) - keySortIndex(right.id);
    else delta = orderIndex(left.id, ITEM_ORDER) - orderIndex(right.id, ITEM_ORDER);
    if (delta !== 0) return delta;
    return itemLabel(left.id).localeCompare(itemLabel(right.id));
  });
}

export function visibleRegionChecks(session: PracticeSession, config?: RandoConfig): WorldCheck[] {
  const collected = new Set(session.collectedCheckIds);
  const events = sessionEvents(session.collectedCheckIds, session.logicEvents ?? []);
  const eitherAge = Boolean(config?.eitherAgeLogic && adultAvailable(config, session.inventory, events));
  return WORLD.checks.filter((check) => {
    if (check.regionId !== session.currentRegionId) return false;
    if (!session.enabledCheckIds.includes(check.id)) return false;
    if (!eitherAge && !ageOk(check.age, session.age)) return false;
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
  return inventory.filter(
    (item) => !item.startsWith("open_") && !HIDDEN_INVENTORY.has(item) && !isJunkItem(item),
  );
}

export function inventoryGroups(
  inventory: string[],
): { title: InventoryGroupTitle; items: { id: string; count: number }[] }[] {
  const groups: Record<InventoryGroupTitle, { id: string; count: number }[]> = {
    Items: [],
    Equipment: [],
    Songs: [],
    Keys: [],
    Quest: [],
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
    groups[classifyItem(item)].push(entry);
  }
  return GROUP_ORDER.filter((title) => groups[title].length).map((title) => ({
    title,
    items: sortGroup(title, groups[title]),
  }));
}

export function isWrong(session: PracticeSession, id: string): boolean {
  return (session.wrongIds ?? []).includes(id);
}

export function labeledItem(id: string): string {
  return itemLabel(id);
}
