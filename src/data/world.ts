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

export const WORLD = world as WorldData;

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
  if (config.games.oot && config.games.mm) flags.push("cross_game");
  return flags;
}

export function spawnRegion(config: RandoConfig): string {
  if (config.spawn !== "auto" && REGION_BY_ID[config.spawn]) return config.spawn;
  if (config.games.oot) return "oot-kokiri";
  return "mm-sct";
}

export function enabledChecks(config: RandoConfig): WorldCheck[] {
  return WORLD.checks.filter((check) => {
    if (!config.games[check.game]) return false;
    return config.checkTypes[check.type];
  });
}

export function ageOk(required: Age, current: Exclude<Age, "any">): boolean {
  return required === "any" || required === current;
}

export function hasAll(inventory: Iterable<string>, needs: string[]): boolean {
  const owned = new Set(inventory);
  return needs.every((need) => owned.has(need));
}

export function canUseConnection(
  connection: Connection,
  inventory: string[],
  age: Exclude<Age, "any">,
): boolean {
  return ageOk(connection.age, age) && hasAll(inventory, connection.needs);
}

export function outgoing(
  regionId: string,
  inventory: string[],
  age: Exclude<Age, "any">,
): Connection[] {
  return WORLD.connections.filter(
    (connection) => connection.from === regionId && canUseConnection(connection, inventory, age),
  );
}

export function allOutgoing(regionId: string): Connection[] {
  return WORLD.connections.filter((connection) => connection.from === regionId);
}

export function reachableRegionIds(
  start: string,
  inventory: string[],
  age: Exclude<Age, "any">,
): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const connection of outgoing(current, inventory, age)) {
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
): boolean {
  if (check.regionId !== currentRegionId) return false;
  if (!ageOk(check.age, age)) return false;
  return hasAll(inventory, check.needs);
}

export function availableWarps(inventory: string[]): Warp[] {
  const owned = new Set(inventory);
  return WORLD.warps.filter((warp) => {
    if (warp.item.startsWith("soaring")) return owned.has("soaring");
    return owned.has(warp.item);
  });
}

export function adultAvailable(config: RandoConfig, inventory: string[]): boolean {
  if (config.startingAge === "adult") return true;
  if (config.openDoorOfTime) return true;
  return inventory.includes("song_of_time") && inventory.includes("ocarina");
}

export function canSwitchAge(config: RandoConfig, inventory: string[], regionId: string): boolean {
  if (regionId !== "oot-tot") return false;
  return adultAvailable(config, inventory);
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
  deku_mask: "Deku Mask",
  goron_mask: "Goron Mask",
  zora_mask: "Zora Mask",
  song_of_healing: "Song of Healing",
  soaring: "Song of Soaring",
  sonata: "Sonata of Awakening",
  lullaby: "Goron Lullaby",
  nwbn: "New Wave Bossa Nova",
  elegy: "Elegy of Emptiness",
  oath: "Oath to Order",
  bow_mm: "Hero's Bow",
  hookshot_mm: "Hookshot (MM)",
  fire_arrow: "Fire Arrow",
  ice_arrow: "Ice Arrow",
  light_arrow: "Light Arrow",
  mirror_shield: "Mirror Shield",
  powder_keg: "Powder Keg",
  lens_mm: "Lens of Truth (MM)",
  garo_mask: "Garo Mask",
  stone_mask: "Stone Mask",
  seahorse: "Seahorse",
  room_key: "Room Key",
  letter_kafei: "Letter to Kafei",
  kokiri_emerald: "Kokiri's Emerald",
  goron_ruby: "Goron's Ruby",
  zora_sapphire: "Zora's Sapphire",
  forest_medallion: "Forest Medallion",
  fire_medallion: "Fire Medallion",
  water_medallion: "Water Medallion",
  shadow_medallion: "Shadow Medallion",
  spirit_medallion: "Spirit Medallion",
  light_medallion: "Light Medallion",
  odolwa: "Odolwa's Remains",
  goht: "Goht's Remains",
  gyorg: "Gyorg's Remains",
  twinmold: "Twinmold's Remains",
  open_forest: "Open Forest",
  open_deku: "Open Deku",
  open_zora: "Open Zora",
  open_door_of_time: "Open Door of Time",
  cross_game: "OoTMM",
  gs_tokens: "Skulltula tokens",
};

export function itemLabel(id: string): string {
  if (id.startsWith("junk_")) return "Junk";
  return ITEM_LABELS[id] ?? id.replaceAll("_", " ");
}
