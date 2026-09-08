import { createConfig } from "../data/presets";
import type { CheckType, RandoConfig } from "../data/types";
import { CHECK_BY_ID, WORLD } from "../data/world";

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

function detectGames(settings: Settings, version: string): { oot: boolean; mm: boolean } {
  const blob = `${version} ${Object.keys(settings).join(" ")}`.toLowerCase();
  const mm = /\b(mm|majora|ootmm|clock town|termina)\b/.test(blob);
  const oot = /\b(oot|ocarina|kokiri|ganon|hyrule)\b/.test(blob) || settings["Closed Forest"] != null;
  if (!oot && !mm) return { oot: true, mm: false };
  return { oot: oot || !mm, mm };
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

function isRandoFile(value: unknown): value is RandoFile {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(record.settings || record.locations || record.trainer || record["Closed Forest"]);
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
    throw new ImportError("JSON needs a settings object, locations, or trainer preset.");
  }
  if (parsed.settings) return parsed;
  if ((parsed as RandoFile).trainer || (parsed as RandoFile).locations) return parsed;
  return { settings: parsed as Record<string, unknown> };
}

export function importRandoFile(raw: string, fileName = "imported.json", defaults?: RandoConfig): ImportResult {
  const file = parseRandoJson(raw);
  const settings = stringifySettings(file.settings ?? {});
  const version = file.version ?? defaults?.randoVersion ?? "";
  const games = detectGames(settings, version);
  const age = startingAge(file, settings);
  const locations = file.locations ?? {};
  const locationNames = Object.keys(locations);
  const importedPlacement: Record<string, string> = {};
  const importedCheckIds: string[] = [];

  for (const [location, value] of Object.entries(locations)) {
    const checkId = matchLocation(location);
    if (!checkId || importedPlacement[checkId]) continue;
    importedPlacement[checkId] = mapItem(locationItem(value));
    importedCheckIds.push(checkId);
  }

  const trainer = file.trainer ?? {};
  const seed = file.seed != null ? String(file.seed) : undefined;
  const name =
    trainer.name ??
    (seed ? `${version || "Rando"} seed ${seed}` : fileName.replace(/\.json$/i, "") || "Imported preset");

  const config = createConfig(
    {
      name,
      games: trainer.games ?? games,
      checkTypes: trainer.checkTypes ?? checkTypesFromSettings(settings),
      startingAge: trainer.startingAge ?? age,
      openForest: trainer.openForest ?? !on(settings["Closed Forest"]),
      openDeku: trainer.openDeku ?? true,
      openZora: trainer.openZora ?? true,
      openDoorOfTime: trainer.openDoorOfTime ?? (settings["Door of Time"] ?? "Open").toLowerCase() === "open",
      spawn: trainer.spawn ?? (age === "adult" && games.oot ? "oot-tot" : "auto"),
      startingItems: trainer.startingItems ?? startingItemsFromSettings(settings),
      randoVersion: version || undefined,
      randoSeed: seed,
      randoSettings: Object.keys(settings).length ? settings : trainer.randoSettings,
      importedPlacement: Object.keys(importedPlacement).length ? importedPlacement : trainer.importedPlacement,
      importedCheckIds: importedCheckIds.length ? importedCheckIds : trainer.importedCheckIds,
      importSummary: locationNames.length
        ? `Matched ${importedCheckIds.length} of ${locationNames.length} spoiler locations`
        : "Settings only — no spoiler locations",
      sourceFileName: fileName,
      penaltySeconds: trainer.penaltySeconds,
      peekPenaltySeconds: trainer.peekPenaltySeconds,
      hideCompleted: trainer.hideCompleted,
      hideLocked: trainer.hideLocked,
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
      "Starting Age": config.startingAge === "adult" ? "Adult" : "Child",
      "Shop Shuffle": config.checkTypes.shop ? "Specific Count" : "Off",
      "Scrubs Shuffle": config.checkTypes.scrub ? "On" : "Off",
      "Token Shuffle": config.checkTypes.skullReward ? "All Tokens" : "Off",
      "Shuffle Adult Trade": config.checkTypes.trade ? "On" : "Off",
    } satisfies Settings);

  return `${JSON.stringify(
    {
      version: config.randoVersion || "OoTMM Check Trainer",
      fileType: 1,
      seed: config.randoSeed,
      settings,
      trainer: {
        name: config.name,
        games: config.games,
        checkTypes: config.checkTypes,
        startingAge: config.startingAge,
        openForest: config.openForest,
        openDeku: config.openDeku,
        openZora: config.openZora,
        openDoorOfTime: config.openDoorOfTime,
        spawn: config.spawn,
        startingItems: config.startingItems,
        penaltySeconds: config.penaltySeconds,
        peekPenaltySeconds: config.peekPenaltySeconds,
        hideCompleted: config.hideCompleted,
        hideLocked: config.hideLocked,
        importedPlacement: config.importedPlacement,
        importedCheckIds: config.importedCheckIds,
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
