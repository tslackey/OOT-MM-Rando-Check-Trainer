import { createConfig } from "../data/presets";
import type { CheckType, RandoConfig } from "../data/types";
import { CHECK_BY_ID, REGION_BY_ID, WORLD } from "../data/world";
import { extractSpawnEntrances } from "./spawns";

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export interface ImportResult {
  config: RandoConfig;
  matchedLocations: number;
  totalLocations: number;
}

type Settings = Record<string, string>;
type LocationValue = string | { item?: string; price?: number };

interface RandoFile {
  version?: string;
  fileType?: number;
  seed?: string | number;
  settings?: Record<string, unknown>;
  SelectedStartingAge?: string;
  locations?: Record<string, LocationValue>;
  entrances?: unknown;
  entrancesMap?: unknown;
  trainer?: Partial<RandoConfig> & { name?: string };
}

const PREFIXES: Record<string, string> = {
  kf: "kokiri forest",
  lw: "lost woods",
  sfm: "sacred meadow",
  hf: "hyrule field",
  llr: "lon lon ranch",
  kak: "kakariko",
  dmt: "death mountain trail",
  dmc: "death mountain crater",
  gc: "goron city",
  zr: "zora river",
  zd: "zora domain",
  zf: "zora fountain",
  lh: "lake hylia",
  gv: "gerudo valley",
  gf: "gerudo fortress",
  hc: "hyrule castle",
  ogc: "outside ganon",
  tot: "temple of time",
};

const LOCATION_ALIASES: Record<string, string> = {
  "KF Kokiri Sword Chest": "oot-kokiri-forest-kokiri-sword-chest",
  "KF Mido Top Left Chest": "oot-mido-s-house-top-left",
  "KF Mido Top Right Chest": "oot-mido-s-house-top-right",
  "KF Mido Bottom Left Chest": "oot-mido-s-house-bottom-left",
  "KF Mido Bottom Right Chest": "oot-mido-s-house-bottom-right",
  "KF Storms Grotto Chest": "oot-kokiri-forest-storms-grotto",
  "Song from Impa": "oot-zelda-s-song",
  "Song from Malon": "oot-lon-lon-ranch-malon-song",
  "Song from Saria": "oot-saria-s-song",
  "Song from Royal Family's Tomb": "oot-graveyard-royal-tomb-song",
  "Song from Ocarina of Time": "oot-hyrule-field-song-of-time",
  "Song from Windmill": "oot-windmill-song-of-storms",
  "Sheik in Forest": "oot-sacred-meadow-sheik-song",
  "Sheik in Crater": "oot-death-mountain-crater-sheik-song",
  "Sheik in Ice Cavern": "oot-ice-cavern-sheik-song",
  "Sheik at Colossus": "oot-desert-colossus-song-spirit",
  "Sheik in Kakariko": "oot-kakariko-song-shadow",
  "Sheik at Temple": "oot-temple-of-time-sheik-song",
  "LW Target in Woods": "oot-lost-woods-target",
  "LW Skull Kid": "oot-lost-woods-skull-kid",
  "LW Ocarina Memory Game": "oot-lost-woods-memory-game",
  "LW Near Shortcuts Grotto Chest": "oot-lost-woods-grotto-generic",
  "LW Deku Theater Skull Mask": "oot-deku-theater-sticks-upgrade",
  "LW Deku Theater Mask of Truth": "oot-deku-theater-nuts-upgrade",
  "Kak Impas House Freestanding PoH": "oot-kakariko-impa-house-hp",
  "Kak Anju as Child": "oot-kakariko-anju-bottle",
  "DMT Freestanding PoH": "oot-death-mountain-trail-hp",
  "Market Lost Dog": "oot-market-dog-lady-hp",
  "Queen Gohma": "oot-deku-tree-boss",
  "King Dodongo": "oot-dodongo-cavern-boss",
  "Barinade": "oot-jabu-jabu-boss",
  "Phantom Ganon": "oot-forest-temple-boss",
  "Volvagia": "oot-fire-temple-boss",
  "Morpha": "oot-water-temple-boss",
  "Bongo Bongo": "oot-shadow-temple-boss",
  "Twinrova": "oot-spirit-temple-boss",
  "Link's Pocket": "oot-temple-of-time-medallion",
  "Gift from Saria": "oot-lost-woods-skull-kid",
  "LW Gift From Saria": "oot-saria-s-song",
  "Forest Temple Map Chest": "oot-forest-temple-map",
  "Forest Temple Raised Island Courtyard Chest": "oot-forest-temple-garden",
  "Forest Temple Eye Switch Chest": "oot-forest-temple-maze",
  "Forest Temple Bow Chest": "oot-forest-temple-bow",
  "Forest Temple First Stalfos Chest": "oot-forest-temple-compass",
  "Forest Temple Falling Ceiling Room Chest": "oot-forest-temple-checkerboard",
  "Forest Temple Basement Chest": "oot-forest-temple-antichamber",
  "Forest Temple Phantom Ganon Heart": "oot-forest-temple-boss-container",
  "Fire Temple Megaton Hammer Chest": "oot-fire-temple-hammer",
  "Fire Temple Volvagia Heart": "oot-fire-temple-boss-container",
  "Water Temple Morpha Heart": "oot-water-temple-boss-hc",
  "Water Temple Central Pillar Chest": "oot-water-temple-under-center",
};

const START_WITH: Record<string, string> = {
  "Start with Ocarina": "ocarina",
  "Start with Kokiri Sword": "kokiri_sword",
  "Start with Hookshot": "hookshot",
  "Start with Bow": "bow",
  "Start with Bomb Bag": "bombs",
  "Start with Slingshot": "slingshot",
  "Start with Boomerang": "boomerang",
  "Start with Megaton Hammer": "hammer",
  "Start with Lens of Truth": "lens",
  "Start with Iron Boots": "iron_boots",
  "Start with Hover Boots": "hover_boots",
  "Start with Magic Meter": "magic",
  "Start with Din's Fire": "dins",
  "Start with Farore's Wind": "farores",
  "Start with Nayru's Love": "nayrus",
  "Start with Fire Arrows": "fire_arrows",
  "Start with Light Arrows": "light_arrows",
  "Start with Zelda's Lullaby": "zelda_lullaby",
  "Start with Epona's Song": "epona",
  "Start with Saria's Song": "saria",
  "Start with Sun's Song": "suns_song",
  "Start with Song of Time": "song_of_time",
  "Start with Song of Storms": "song_of_storms",
  "Start with Minuet of Forest": "minuet",
  "Start with Bolero of Fire": "bolero",
  "Start with Serenade of Water": "serenade",
  "Start with Requiem of Spirit": "requiem",
  "Start with Nocturne of Shadow": "nocturne",
  "Start with Prelude of Light": "prelude",
  "Start with Gerudo Card": "gerudo_card",
  "Start with Strength Upgrade": "strength",
  "Start with Diving Scale": "silver_scale",
  "Start with Mirror Shield": "mirror_shield",
};

const ITEM_IDS: Record<string, string> = {
  "Progressive Ocarina": "ocarina",
  "Ocarina of Time": "ocarina",
  "Fairy Ocarina": "ocarina",
  "Progressive Hookshot": "hookshot",
  Hookshot: "hookshot",
  Longshot: "longshot",
  "Progressive Bow": "bow",
  Bow: "bow",
  "Fairy Bow": "bow",
  "Progressive Strength Upgrade": "strength",
  "Strength Upgrade": "strength",
  "Kokiri Sword": "kokiri_sword",
  "Progressive Bomb Bag": "bombs",
  "Bomb Bag": "bombs",
  "Progressive Slingshot": "slingshot",
  Slingshot: "slingshot",
  Boomerang: "boomerang",
  "Megaton Hammer": "hammer",
  Hammer: "hammer",
  "Lens of Truth": "lens",
  "Iron Boots": "iron_boots",
  "Hover Boots": "hover_boots",
  "Progressive Magic Meter": "magic",
  "Magic Meter": "magic",
  "Din's Fire": "dins",
  "Farore's Wind": "farores",
  "Nayru's Love": "nayrus",
  "Fire Arrows": "fire_arrows",
  "Light Arrows": "light_arrows",
  "Zelda's Lullaby": "zelda_lullaby",
  "Epona's Song": "epona",
  "Saria's Song": "saria",
  "Sun's Song": "suns_song",
  "Song of Time": "song_of_time",
  "Song of Storms": "song_of_storms",
  "Minuet of Forest": "minuet",
  "Bolero of Fire": "bolero",
  "Serenade of Water": "serenade",
  "Nocturne of Shadow": "nocturne",
  "Requiem of Spirit": "requiem",
  "Prelude of Light": "prelude",
  "Gerudo Membership Card": "gerudo_card",
  "Silver Scale": "silver_scale",
  "Golden Scale": "golden_scale",
  "Progressive Scale": "silver_scale",
  Bottle: "bottle",
  "Bottle with Blue Potion": "bottle",
  "Bottle with Red Potion": "bottle",
  "Kokiri's Emerald": "kokiri_emerald",
  "Goron's Ruby": "goron_ruby",
  "Zora's Sapphire": "zora_sapphire",
  "Forest Medallion": "forest_medallion",
  "Fire Medallion": "fire_medallion",
  "Water Medallion": "water_medallion",
  "Shadow Medallion": "shadow_medallion",
  "Spirit Medallion": "spirit_medallion",
  "Light Medallion": "light_medallion",
  "Mirror Shield": "mirror_shield",
  "Gold Skulltula Token": "gs_tokens",
  "Small Key (Forest Temple)": "small_key_forest",
  "Boss Key (Forest Temple)": "boss_key_forest",
  "Small Key (Fire Temple)": "small_key_fire",
  "Boss Key (Fire Temple)": "boss_key_fire",
  "Small Key (Water Temple)": "small_key_water",
  "Boss Key (Water Temple)": "boss_key_water",
  "Small Key (Shadow Temple)": "small_key_shadow",
  "Boss Key (Shadow Temple)": "boss_key_shadow",
  "Small Key (Spirit Temple)": "small_key_spirit",
  "Boss Key (Spirit Temple)": "boss_key_spirit",
  "Small Key (Bottom of the Well)": "small_key_well",
  "Small Key (Gerudo Training Ground)": "small_key_gtg",
  "Small Key (Gerudo Training Grounds)": "small_key_gtg",
  "Small Key (Ganons Castle)": "small_key_ganon",
  "Small Key (Ganon's Castle)": "small_key_ganon",
  "Boss Key (Ganons Castle)": "boss_key_ganon",
  "Boss Key (Ganon's Castle)": "boss_key_ganon",
  "Hideout Small Key": "small_key_hideout",
  "Small Key (Gerudo Fortress)": "small_key_hideout",
  "Small Key (Treasure Chest Game)": "small_key_treasure",
  "Silver Gauntlets": "silver_gauntlets",
  "Golden Gauntlets": "golden_gauntlets",
};

function on(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "on" || v === "yes" || v === "true";
}

function off(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "off" || v === "no" || v === "false" || v === "vanilla" || v === "none";
}

function stringifySettings(raw: Record<string, unknown>): Settings {
  const out: Settings = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    out[key] = typeof value === "string" ? value : String(value);
  }
  return out;
}

function locationItem(value: LocationValue): string {
  if (typeof value === "string") return value;
  return value.item ?? "Unknown";
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\bgs\b/g, "skulltula")
    .replace(/\bfreestanding poh\b/g, "hp")
    .replace(/\bpoh\b/g, "hp")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function expandLocation(name: string): string {
  const parts = name.split(/\s+/);
  const prefix = PREFIXES[parts[0]?.toLowerCase() ?? ""];
  if (!prefix) return name;
  return [prefix, ...parts.slice(1)].join(" ");
}

function tokens(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

function scoreNames(location: string, checkName: string): number {
  const left = tokens(expandLocation(location));
  const right = tokens(checkName);
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const overlap = left.filter((token) => rightSet.has(token)).length;
  return overlap / Math.max(left.length, rightSet.size);
}

const CHECK_INDEX = WORLD.checks.map((check) => ({
  id: check.id,
  name: check.name,
  tokens: tokens(check.name),
}));

function matchLocation(location: string): string | undefined {
  const aliased = LOCATION_ALIASES[location];
  if (aliased && CHECK_BY_ID[aliased]) return aliased;
  const expanded = normalize(expandLocation(location));
  const exact = CHECK_INDEX.find((check) => normalize(check.name) === expanded);
  if (exact) return exact.id;
  let bestId: string | undefined;
  let best = 0.72;
  for (const check of CHECK_INDEX) {
    const score = scoreNames(location, check.name);
    if (score > best) {
      best = score;
      bestId = check.id;
    }
  }
  return bestId;
}

function mapItem(name: string): string {
  return ITEM_IDS[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function checkTypesFromSettings(settings: Settings): Record<CheckType, boolean> {
  return {
    chest: true,
    song: true,
    dungeonReward: !off(settings["Shuffle Dungeon Rewards"]),
    scrub: !off(settings["Scrubs Shuffle"]),
    shop: !off(settings["Shop Shuffle"]),
    trade: !off(settings["Shuffle Adult Trade"]),
    skullReward: !off(settings["Token Shuffle"]) || on(settings["Shuffle 100 GS Reward"]),
  };
}

function startingItemsFromSettings(settings: Settings): string[] {
  const items: string[] = [];
  for (const [key, item] of Object.entries(START_WITH)) {
    if (on(settings[key])) items.push(item);
  }
  return items;
}

function startingAge(file: RandoFile, settings: Settings): "child" | "adult" {
  const selected =
    file.SelectedStartingAge || settings["Selected Starting Age"] || settings["Starting Age"] || "Child";
  return selected.toLowerCase().includes("adult") ? "adult" : "child";
}

function isRandomStartingAge(settings: Settings): boolean {
  return (settings["Starting Age"] ?? "").toLowerCase() === "random";
}

function isRandoFile(value: unknown): value is RandoFile {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(
    record.settings ||
      record.locations ||
      record.trainer ||
      record.entrances ||
      record.entrancesMap ||
      record["Closed Forest"],
  );
}

export function parseRandoJson(raw: string): RandoFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ImportError("That file is not valid JSON.");
  }
  if (Array.isArray(parsed)) {
    throw new ImportError("Expected a settings or spoiler object, not an array.");
  }
  if (!isRandoFile(parsed)) {
    throw new ImportError("JSON needs a settings object, locations, spoiler, or trainer preset.");
  }
  if (parsed.settings) return parsed;
  if (
    (parsed as RandoFile).trainer ||
    (parsed as RandoFile).locations ||
    (parsed as RandoFile).entrances ||
    (parsed as RandoFile).entrancesMap
  ) {
    return parsed;
  }
  return { settings: parsed as Record<string, unknown> };
}

export function importRandoFile(raw: string, fileName = "imported.json", defaults?: RandoConfig): ImportResult {
  const file = parseRandoJson(raw);
  const settings = stringifySettings(file.settings ?? {});
  const version = file.version ?? defaults?.randoVersion ?? "";
  const age = startingAge(file, settings);
  const locations = file.locations ?? {};
  const locationNames = Object.keys(locations);
  const importedPlacement: Record<string, string> = {};
  const importedCheckIds: string[] = [];

  for (const [location, value] of Object.entries(locations)) {
    const checkId = matchLocation(location);
    if (!checkId || importedPlacement[checkId]) continue;
    if (CHECK_BY_ID[checkId]?.game !== "oot") continue;
    importedPlacement[checkId] = mapItem(locationItem(value));
    importedCheckIds.push(checkId);
  }

  const trainer = file.trainer ?? {};
  const seed = file.seed != null ? String(file.seed) : undefined;
  const name =
    trainer.name ??
    (seed ? `${version || "Rando"} seed ${seed}` : fileName.replace(/\.json$/i, "") || "Imported preset");
  const spawnShuffle = trainer.spawnShuffle ?? on(settings["Overworld Spawns"]);
  const spawns = extractSpawnEntrances(file);
  const childSpawn = trainer.childSpawn ?? spawns.child ?? "auto";
  const adultSpawn = trainer.adultSpawn ?? spawns.adult ?? "auto";
  const startSpawn =
    trainer.spawn ??
    (age === "adult"
      ? adultSpawn !== "auto"
        ? adultSpawn
        : spawnShuffle
          ? "auto"
          : "oot-tot"
      : childSpawn !== "auto"
        ? childSpawn
        : spawnShuffle
          ? "auto"
          : "auto");
  const spawnNote =
    childSpawn !== "auto" || adultSpawn !== "auto"
      ? `Child spawn ${childSpawn === "auto" ? "vanilla" : childSpawn}; adult spawn ${adultSpawn === "auto" ? "vanilla" : adultSpawn}. `
      : spawnShuffle
        ? "Overworld spawns shuffled — each practice seed picks child/adult save warps. "
        : "";

  const config = createConfig(
    {
      name,
      games: { oot: true, mm: false },
      checkTypes: trainer.checkTypes ?? checkTypesFromSettings(settings),
      startingAge: trainer.startingAge ?? age,
      randomStartingAge: trainer.randomStartingAge ?? isRandomStartingAge(settings),
      openForest: trainer.openForest ?? !on(settings["Closed Forest"]),
      openDeku: trainer.openDeku ?? true,
      openZora: trainer.openZora ?? true,
      openDoorOfTime: trainer.openDoorOfTime ?? (settings["Door of Time"] ?? "Open").toLowerCase() === "open",
      spawn: startSpawn,
      childSpawn,
      adultSpawn,
      spawnShuffle,
      startingItems: trainer.startingItems ?? startingItemsFromSettings(settings),
      randoVersion: version || undefined,
      randoSeed: seed,
      randoSettings: Object.keys(settings).length ? settings : trainer.randoSettings,
      importedPlacement: Object.keys(importedPlacement).length ? importedPlacement : trainer.importedPlacement,
      importedCheckIds: importedCheckIds.length ? importedCheckIds : trainer.importedCheckIds,
      importedEntrances: Object.keys(spawns.raw).length ? spawns.raw : trainer.importedEntrances,
      importSummary: locationNames.length
        ? `${spawnNote}Matched ${importedCheckIds.length} of ${locationNames.length} spoiler locations`
        : `${spawnNote || ""}Settings only — no spoiler locations`.trim(),
      sourceFileName: fileName,
      penaltySeconds: trainer.penaltySeconds,
      peekPenaltySeconds: trainer.peekPenaltySeconds,
      hideCompleted: trainer.hideCompleted,
      hideLocked: trainer.hideLocked,
      eitherAgeLogic: trainer.eitherAgeLogic,
    },
    defaults,
  );

  return {
    config,
    matchedLocations: importedCheckIds.length,
    totalLocations: locationNames.length,
  };
}

export function exportRandoFile(config: RandoConfig): string {
  const settings =
    config.randoSettings ??
    ({
      "Closed Forest": config.openForest ? "Off" : "On",
      "Door of Time": config.openDoorOfTime ? "Open" : "Closed",
      "Zora's Fountain": config.openZora ? "Open" : "Closed",
      "Starting Age": config.randomStartingAge ? "Random" : config.startingAge === "adult" ? "Adult" : "Child",
      "Selected Starting Age": config.startingAge === "adult" ? "Adult" : "Child",
      "Overworld Spawns": config.spawnShuffle ? "On" : "Off",
      "Shop Shuffle": config.checkTypes.shop ? "Specific Count" : "Off",
      "Scrubs Shuffle": config.checkTypes.scrub ? "On" : "Off",
      "Token Shuffle": config.checkTypes.skullReward ? "All Tokens" : "Off",
      "Shuffle Adult Trade": config.checkTypes.trade ? "On" : "Off",
    } satisfies Settings);

  const locations: Record<string, string> = {};
  if (config.importedPlacement) {
    for (const [checkId, item] of Object.entries(config.importedPlacement)) {
      locations[CHECK_BY_ID[checkId]?.name ?? checkId] = item;
    }
  }

  const child = config.childSpawn !== "auto" ? config.childSpawn : "oot-kokiri";
  const adult = config.adultSpawn !== "auto" ? config.adultSpawn : "oot-tot";

  return `${JSON.stringify(
    {
      version: config.randoVersion || "OoT Check Trainer",
      fileType: config.importedPlacement ? 3 : 1,
      seed: config.randoSeed,
      settings,
      SelectedStartingAge: config.startingAge === "adult" ? "Adult" : "Child",
      ...(Object.keys(locations).length ? { locations } : {}),
      entrancesMap: {
        "sphere 00": {
          "Child Spawn": REGION_BY_ID[child]?.name ?? "Kokiri Forest",
          "Adult Spawn": REGION_BY_ID[adult]?.name ?? "Temple of Time",
          ...config.importedEntrances,
        },
      },
      trainer: {
        name: config.name,
        games: config.games,
        checkTypes: config.checkTypes,
        startingAge: config.startingAge,
        randomStartingAge: config.randomStartingAge,
        openForest: config.openForest,
        openDeku: config.openDeku,
        openZora: config.openZora,
        openDoorOfTime: config.openDoorOfTime,
        spawn: config.spawn,
        childSpawn: config.childSpawn,
        adultSpawn: config.adultSpawn,
        spawnShuffle: config.spawnShuffle,
        startingItems: config.startingItems,
        penaltySeconds: config.penaltySeconds,
        peekPenaltySeconds: config.peekPenaltySeconds,
        hideCompleted: config.hideCompleted,
        hideLocked: config.hideLocked,
        eitherAgeLogic: config.eitherAgeLogic,
        importedPlacement: config.importedPlacement,
        importedCheckIds: config.importedCheckIds,
        importedEntrances: config.importedEntrances,
        importSummary: config.importSummary,
      },
    },
    null,
    4,
  )}\n`;
}

export function downloadText(fileName: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export { matchLocation, mapItem };
