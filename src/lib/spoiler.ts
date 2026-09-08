import type { PracticeSession, RandoConfig } from "../data/types";
import { CHECK_BY_ID, enabledChecks, itemLabel } from "../data/world";
import { resolveSpawns, spawnLabel } from "./spawns";
import { hashSeed, mulberry32, placeItems } from "./shuffle";

const LOCATION_NAMES: Record<string, string> = {
  "oot-kokiri-forest-kokiri-sword-chest": "KF Kokiri Sword Chest",
  "oot-mido-s-house-top-left": "KF Mido Top Left Chest",
  "oot-mido-s-house-top-right": "KF Mido Top Right Chest",
  "oot-mido-s-house-bottom-left": "KF Mido Bottom Left Chest",
  "oot-mido-s-house-bottom-right": "KF Mido Bottom Right Chest",
  "oot-zelda-s-song": "Song from Impa",
  "oot-lon-lon-ranch-malon-song": "Song from Malon",
  "oot-saria-s-song": "Song from Saria",
  "oot-graveyard-royal-tomb-song": "Song from Royal Family's Tomb",
  "oot-hyrule-field-song-of-time": "Song from Ocarina of Time",
  "oot-windmill-song-of-storms": "Song from Windmill",
  "oot-sacred-meadow-sheik-song": "Sheik in Forest",
  "oot-death-mountain-crater-sheik-song": "Sheik in Crater",
  "oot-ice-cavern-sheik-song": "Sheik in Ice Cavern",
  "oot-desert-colossus-song-spirit": "Sheik at Colossus",
  "oot-kakariko-song-shadow": "Sheik in Kakariko",
  "oot-temple-of-time-sheik-song": "Sheik at Temple",
  "oot-lost-woods-target": "LW Target in Woods",
  "oot-lost-woods-skull-kid": "LW Skull Kid",
  "oot-deku-theater-sticks-upgrade": "LW Deku Theater Skull Mask",
  "oot-deku-theater-nuts-upgrade": "LW Deku Theater Mask of Truth",
  "oot-deku-tree-boss": "Queen Gohma",
  "oot-dodongo-cavern-boss": "King Dodongo",
  "oot-jabu-jabu-boss": "Barinade",
  "oot-forest-temple-boss": "Phantom Ganon",
  "oot-fire-temple-boss": "Volvagia",
  "oot-water-temple-boss": "Morpha",
  "oot-shadow-temple-boss": "Bongo Bongo",
  "oot-spirit-temple-boss": "Twinrova",
  "oot-temple-of-time-medallion": "Link's Pocket",
};

export interface GeneratedSpoiler {
  seed: number;
  startingAge: "child" | "adult";
  childSpawnId: string;
  adultSpawnId: string;
  placement: Record<string, string>;
  locations: Record<string, string>;
  entrances: Record<string, string>;
}

function resolveAge(config: RandoConfig, seed: number): "child" | "adult" {
  const selected = config.randoSettings?.["Selected Starting Age"];
  if (selected?.toLowerCase().includes("adult")) return "adult";
  if (selected?.toLowerCase().includes("child")) return "child";
  if (config.randomStartingAge) {
    return mulberry32(hashSeed(`${seed}:age`))() < 0.5 ? "child" : "adult";
  }
  return config.startingAge;
}

function locationName(checkId: string): string {
  const check = CHECK_BY_ID[checkId];
  return LOCATION_NAMES[checkId] ?? check?.ootrLocation ?? check?.name ?? checkId;
}

function itemName(itemId: string): string {
  if (itemId.startsWith("junk_")) return "Junk";
  return itemLabel(itemId);
}

export function generateSpoiler(config: RandoConfig, seed = Date.now()): GeneratedSpoiler {
  const checks = enabledChecks(config);
  const generated = placeItems(checks, seed);
  const placement = { ...generated, ...config.importedPlacement };
  const startingAge = resolveAge(config, seed);
  const { childSpawnId, adultSpawnId } = resolveSpawns(config, seed, startingAge);
  const locations: Record<string, string> = {};
  for (const check of checks) {
    locations[locationName(check.id)] = itemName(placement[check.id] ?? "junk_1");
  }
  return {
    seed,
    startingAge,
    childSpawnId,
    adultSpawnId,
    placement,
    locations,
    entrances: {
      "Child Spawn": spawnLabel(childSpawnId),
      "Adult Spawn": spawnLabel(adultSpawnId),
      ...config.importedEntrances,
    },
  };
}

export function startingRegion(spoiler: GeneratedSpoiler): string {
  return spoiler.startingAge === "adult" ? spoiler.adultSpawnId : spoiler.childSpawnId;
}

export function exportGeneratedSpoiler(config: RandoConfig, spoiler: GeneratedSpoiler): string {
  return `${JSON.stringify(
    {
      version: config.randoVersion || "OoT Check Trainer",
      fileType: 3,
      seed: config.randoSeed || String(spoiler.seed),
      settings: {
        ...(config.randoSettings ?? {}),
        "Starting Age": config.randomStartingAge ? "Random" : spoiler.startingAge === "adult" ? "Adult" : "Child",
        "Selected Starting Age": spoiler.startingAge === "adult" ? "Adult" : "Child",
        "Overworld Spawns": config.spawnShuffle ? "On" : (config.randoSettings?.["Overworld Spawns"] ?? "Off"),
        "Closed Forest": config.openForest ? "Off" : "On",
        "Door of Time": config.openDoorOfTime ? "Open" : "Closed",
      },
      SelectedStartingAge: spoiler.startingAge === "adult" ? "Adult" : "Child",
      locations: spoiler.locations,
      entrancesMap: {
        "sphere 00": spoiler.entrances,
      },
      trainer: {
        name: config.name,
        startingAge: spoiler.startingAge,
        childSpawn: spoiler.childSpawnId,
        adultSpawn: spoiler.adultSpawnId,
        spawnShuffle: config.spawnShuffle,
        spawn: spoiler.startingAge === "adult" ? spoiler.adultSpawnId : spoiler.childSpawnId,
      },
    },
    null,
    4,
  )}\n`;
}

export function exportSessionSpoiler(session: PracticeSession, config: RandoConfig): string {
  const spoiler = generateSpoiler(
    {
      ...config,
      startingAge: session.age,
      randomStartingAge: false,
      childSpawn: session.childSpawnId,
      adultSpawn: session.adultSpawnId,
      importedPlacement: session.placement,
    },
    session.seed,
  );
  return exportGeneratedSpoiler(config, spoiler);
}
