import world from "./world.json";
import type {
  Age,
  Connection,
  RandoConfig,
  Region,
  Warp,
  WorldCheck,
  WorldData,
} from "./types";
import {
  checkLocationInLogic,
  connectionInLogic,
  doorOfTimeOpen,
  eventsFromCollected,
  visitEvents,
  warpInLogic,
} from "../logic/oracle";
import type { LogicAge } from "../logic/state";

const MM_ITEMS = new Set([
  "deku_mask",
  "goron_mask",
  "zora_mask",
  "song_of_healing",
  "soaring",
  "sonata",
  "lullaby",
  "nwbn",
  "elegy",
  "oath",
  "bow_mm",
  "hookshot_mm",
  "fire_arrow",
  "ice_arrow",
  "light_arrow",
  "powder_keg",
  "lens_mm",
  "garo_mask",
  "stone_mask",
  "seahorse",
  "room_key",
  "letter_kafei",
  "odolwa",
  "goht",
  "gyorg",
  "twinmold",
  "cross_game",
]);

export function isMajoraItem(item: string): boolean {
  if (item.endsWith("_mm") || item.startsWith("soaring")) return true;
  return MM_ITEMS.has(item);
}

function ootOnlyWorld(data: WorldData): WorldData {
  const regions = data.regions.filter((region) => region.game === "oot");
  const regionIds = new Set(regions.map((region) => region.id));
  return {
    regions,
    connections: data.connections.filter((connection) => regionIds.has(connection.from) && regionIds.has(connection.to)),
    warps: data.warps.filter((warp) => regionIds.has(warp.regionId)),
    checks: data.checks.filter((check) => check.game === "oot"),
    itemPool: {
      progression: data.itemPool.progression.filter((item) => !isMajoraItem(item)),
      junk: data.itemPool.junk,
    },
  };
}

export const WORLD = ootOnlyWorld(world as WorldData);

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(
  WORLD.regions.map((region) => [region.id, region]),
);

export const CHECK_BY_ID: Record<string, WorldCheck> = Object.fromEntries(
  WORLD.checks.map((check) => [check.id, check]),
);

export function flagsFor(config: RandoConfig): string[] {
  const flags: string[] = [];
  if (config.openForest) flags.push("open_forest");
  if (config.openDeku) flags.push("open_deku");
  if (config.openZora) flags.push("open_zora");
  if (config.openDoorOfTime) flags.push("open_door_of_time");
  return flags;
}

export function vanillaSpawn(age: Exclude<Age, "any">): string {
  return age === "adult" ? "oot-tot" : "oot-kokiri";
}

export function overworldSpawnRegions(age: Exclude<Age, "any"> = "child"): Region[] {
  return WORLD.regions.filter((region) => {
    if (region.game !== "oot" || region.dungeon) return false;
    if (age === "child" && region.id === "oot-ganon-out") return false;
    if (age === "adult" && region.id === "oot-castle") return false;
    return true;
  });
}

export function spawnForAge(config: RandoConfig, age: Exclude<Age, "any">): string {
  const pinned = age === "adult" ? config.adultSpawn : config.childSpawn;
  if (pinned && pinned !== "auto" && REGION_BY_ID[pinned]?.game === "oot") return pinned;
  const requested = config.spawn !== "auto" ? REGION_BY_ID[config.spawn] : undefined;
  if (requested?.game === "oot") return requested.id;
  return vanillaSpawn(age);
}

export function spawnRegion(config: RandoConfig): string {
  return spawnForAge(config, config.startingAge);
}

export function enabledChecks(config: RandoConfig): WorldCheck[] {
  return WORLD.checks.filter((check) => {
    if (!config.games[check.game]) return false;
    if (!config.checkTypes[check.type]) return false;
    if (config.importedCheckIds?.length) return config.importedCheckIds.includes(check.id);
    return true;
  });
}

export function ageOk(required: Age, current: Exclude<Age, "any">): boolean {
  return required === "any" || required === current;
}

export function hasAll(inventory: Iterable<string>, needs: string[]): boolean {
  const owned = new Set(inventory);
  return needs.every((need) => owned.has(need));
}

export function sessionEvents(collectedCheckIds: Iterable<string> = [], extra: Iterable<string> = []): string[] {
  return eventsFromCollected(collectedCheckIds, extra);
}

export function collectVisitEvents(
  regionId: string,
  inventory: string[],
  age: Exclude<Age, "any">,
  config?: RandoConfig,
  extra?: Iterable<string>,
): string[] {
  return visitEvents(regionId, inventory, age as LogicAge, config, extra);
}

export function canUseConnection(
  connection: Connection,
  inventory: string[],
  age: Exclude<Age, "any">,
  config?: RandoConfig,
  events?: Iterable<string>,
): boolean {
  if (!ageOk(connection.age, age)) return false;
  return connectionInLogic(connection, inventory, age as LogicAge, config, events);
}

export function outgoing(
  regionId: string,
  inventory: string[],
  age: Exclude<Age, "any">,
  config?: RandoConfig,
  events?: Iterable<string>,
): Connection[] {
  return WORLD.connections.filter(
    (connection) => connection.from === regionId && canUseConnection(connection, inventory, age, config, events),
  );
}

export function allOutgoing(regionId: string, games: { oot: boolean; mm: boolean } = { oot: true, mm: false }): Connection[] {
  return WORLD.connections.filter((connection) => {
    if (connection.from !== regionId) return false;
    const dest = REGION_BY_ID[connection.to];
    return Boolean(dest && games[dest.game]);
  });
}

export function reachableRegionIds(
  start: string,
  inventory: string[],
  age: Exclude<Age, "any">,
  config?: RandoConfig,
  events?: Iterable<string>,
): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const connection of outgoing(current, inventory, age, config, events)) {
      if (!seen.has(connection.to)) {
        seen.add(connection.to);
        queue.push(connection.to);
      }
    }
  }
  return seen;
}

export function checkInLogic(
  check: WorldCheck,
  inventory: string[],
  age: Exclude<Age, "any">,
  currentRegionId: string,
  config?: RandoConfig,
  events?: Iterable<string>,
): boolean {
  return checkLocationInLogic(check, inventory, age as LogicAge, currentRegionId, config, events);
}

export function hasOcarina(inventory: Iterable<string>): boolean {
  return new Set(inventory).has("ocarina");
}

export function warpSongOwned(inventory: Iterable<string>, warp: Warp): boolean {
  const owned = new Set(inventory);
  return owned.has(warp.item);
}

export function availableWarps(
  inventory: string[],
  age: Exclude<Age, "any"> = "child",
  config?: RandoConfig,
  events?: Iterable<string>,
): Warp[] {
  if (!hasOcarina(inventory)) return [];
  return WORLD.warps.filter((warp) => {
    if (!warpSongOwned(inventory, warp)) return false;
    if (!config) return true;
    return warpInLogic(warp, inventory, age as LogicAge, config, events);
  });
}

export function adultAvailable(config: RandoConfig, inventory: string[], events?: Iterable<string>): boolean {
  if (config.startingAge === "adult") return true;
  return doorOfTimeOpen(inventory, config, events);
}

export function canSwitchAge(
  config: RandoConfig,
  inventory: string[],
  regionId: string,
  events?: Iterable<string>,
): boolean {
  if (regionId !== "oot-tot") return false;
  return adultAvailable(config, inventory, events);
}

export const ITEM_LABELS: Record<string, string> = {
  kokiri_sword: "Kokiri Sword",
  slingshot: "Slingshot",
  bombs: "Bombs",
  bow: "Bow",
  hookshot: "Hookshot",
  longshot: "Longshot",
  hammer: "Megaton Hammer",
  boomerang: "Boomerang",
  lens: "Lens of Truth",
  iron_boots: "Iron Boots",
  hover_boots: "Hover Boots",
  strength: "Goron Bracelet",
  silver_scale: "Silver Scale",
  golden_scale: "Golden Scale",
  magic: "Magic",
  dins: "Din's Fire",
  farores: "Farore's Wind",
  nayrus: "Nayru's Love",
  fire_arrows: "Fire Arrows",
  light_arrows: "Light Arrows",
  ocarina: "Ocarina",
  song_of_time: "Song of Time",
  song_of_storms: "Song of Storms",
  saria: "Saria's Song",
  epona: "Epona's Song",
  suns_song: "Sun's Song",
  zelda_lullaby: "Zelda's Lullaby",
  minuet: "Minuet of Forest",
  bolero: "Bolero of Fire",
  serenade: "Serenade of Water",
  nocturne: "Nocturne of Shadow",
  requiem: "Requiem of Spirit",
  prelude: "Prelude of Light",
  gerudo_card: "Gerudo Card",
  bottle: "Bottle",
  deku_shield: "Deku Shield",
  skull_mask: "Skull Mask",
  mask_of_truth: "Mask of Truth",
  mirror_shield: "Mirror Shield",
  kokiri_emerald: "Kokiri's Emerald",
  goron_ruby: "Goron's Ruby",
  zora_sapphire: "Zora's Sapphire",
  forest_medallion: "Forest Medallion",
  fire_medallion: "Fire Medallion",
  water_medallion: "Water Medallion",
  shadow_medallion: "Shadow Medallion",
  spirit_medallion: "Spirit Medallion",
  light_medallion: "Light Medallion",
  open_forest: "Open Forest",
  open_deku: "Open Deku",
  open_zora: "Open Zora",
  open_door_of_time: "Open Door of Time",
  gs_tokens: "Skulltula tokens",
  small_key_forest: "Forest Temple Small Key",
  small_key_fire: "Fire Temple Small Key",
  small_key_water: "Water Temple Small Key",
  small_key_shadow: "Shadow Temple Small Key",
  small_key_spirit: "Spirit Temple Small Key",
  small_key_well: "Well Small Key",
  small_key_gtg: "Training Ground Small Key",
  small_key_ganon: "Ganon's Castle Small Key",
  small_key_hideout: "Hideout Small Key",
  boss_key_forest: "Forest Temple Boss Key",
  boss_key_fire: "Fire Temple Boss Key",
  boss_key_water: "Water Temple Boss Key",
  boss_key_shadow: "Shadow Temple Boss Key",
  boss_key_spirit: "Spirit Temple Boss Key",
  boss_key_ganon: "Ganon's Castle Boss Key",
  silver_gauntlets: "Silver Gauntlets",
  golden_gauntlets: "Golden Gauntlets",
};

export function itemLabel(id: string): string {
  if (id.startsWith("junk_") || isMajoraItem(id)) return "Junk";
  return ITEM_LABELS[id] ?? id.replaceAll("_", " ");
}
