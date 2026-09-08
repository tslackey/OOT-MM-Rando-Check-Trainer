import type { Age, RandoConfig, Region } from "../data/types";
import { overworldSpawnRegions, REGION_BY_ID, vanillaSpawn, WORLD } from "../data/world";
import { hashSeed, mulberry32 } from "./shuffle";

const PREFIX_REGIONS: Record<string, string> = {
  kf: "oot-kokiri",
  lw: "oot-lost-woods",
  sfm: "oot-sfm",
  hf: "oot-field",
  llr: "oot-llr",
  kak: "oot-kak",
  dmt: "oot-dmt",
  dmc: "oot-dmc",
  gc: "oot-gc",
  zr: "oot-zr",
  zd: "oot-zd",
  zf: "oot-zf",
  lh: "oot-lh",
  gv: "oot-gv",
  gf: "oot-gf",
  hc: "oot-castle",
  ogc: "oot-ganon-out",
  tot: "oot-tot",
};

const HINTS: { test: RegExp; regionId: string }[] = [
  { test: /link'?s house|kokiri|mido|know.?it.?all/, regionId: "oot-kokiri" },
  { test: /lost woods|skull kid|deku theater/, regionId: "oot-lost-woods" },
  { test: /sacred (forest )?meadow|sfm/, regionId: "oot-sfm" },
  { test: /hyrule field/, regionId: "oot-field" },
  { test: /market|guard house|dog lady|shooting gallery/, regionId: "oot-market" },
  { test: /temple of time|prelude/, regionId: "oot-tot" },
  { test: /hyrule castle|zelda/, regionId: "oot-castle" },
  { test: /ganon|rainbow bridge|ogc/, regionId: "oot-ganon-out" },
  { test: /lon lon|epona|ranch|malon|talon/, regionId: "oot-llr" },
  { test: /kakariko|impa|windmill|skulltula house|anju/, regionId: "oot-kak" },
  { test: /graveyard|dampe|shadow temple/, regionId: "oot-graveyard" },
  { test: /death mountain trail|dodongo/, regionId: "oot-dmt" },
  { test: /goron city/, regionId: "oot-gc" },
  { test: /death mountain crater|bolero/, regionId: "oot-dmc" },
  { test: /zora'?s river/, regionId: "oot-zr" },
  { test: /zora'?s domain/, regionId: "oot-zd" },
  { test: /zora'?s fountain|jabu|ice cavern/, regionId: "oot-zf" },
  { test: /lake hylia|fishing|laboratory|serenade/, regionId: "oot-lh" },
  { test: /gerudo valley/, regionId: "oot-gv" },
  { test: /gerudo fortress|carpenter|gtg|training ground/, regionId: "oot-gf" },
  { test: /wasteland/, regionId: "oot-wasteland" },
  { test: /colossus|requiem/, regionId: "oot-colossus" },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchSpawnDestination(destination: string): string | undefined {
  const trimmed = destination.trim();
  if (REGION_BY_ID[trimmed]) return trimmed;
  const prefix = PREFIX_REGIONS[trimmed.split(/\s+/)[0]?.toLowerCase() ?? ""];
  if (prefix) return prefix;

  const n = normalize(trimmed);
  const byName = WORLD.regions
    .filter((region) => region.game === "oot")
    .find((region) => n.includes(normalize(region.name)));
  if (byName) return byName.id;

  for (const hint of HINTS) {
    if (hint.test.test(n)) return hint.regionId;
  }
  return undefined;
}

function collectNamedStrings(value: unknown, into: Record<string, string>): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectNamedStrings(entry, into));
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (typeof nested === "string") into[key] = nested;
    else collectNamedStrings(nested, into);
  }
}

export function extractSpawnEntrances(file: {
  entrances?: unknown;
  entrancesMap?: unknown;
}): { child?: string; adult?: string; raw: Record<string, string> } {
  const raw: Record<string, string> = {};
  collectNamedStrings(file.entrances, raw);
  collectNamedStrings(file.entrancesMap, raw);
  let child: string | undefined;
  let adult: string | undefined;
  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase();
    if (k.includes("child spawn")) child = matchSpawnDestination(value) ?? child;
    if (k.includes("adult spawn")) adult = matchSpawnDestination(value) ?? adult;
  }
  return { child, adult, raw };
}

function pickRegion(pool: Region[], rand: () => number, avoid?: string): string {
  const choices = avoid ? pool.filter((region) => region.id !== avoid) : pool;
  const list = choices.length ? choices : pool;
  return list[Math.floor(rand() * list.length)]?.id ?? vanillaSpawn("child");
}

export function resolveSpawns(
  config: RandoConfig,
  seed: number,
  age: Exclude<Age, "any">,
): { childSpawnId: string; adultSpawnId: string } {
  const shuffle = config.spawnShuffle || (config.randoSettings?.["Overworld Spawns"] ?? "").toLowerCase() === "on";
  const childPinned = config.childSpawn && config.childSpawn !== "auto";
  const adultPinned = config.adultSpawn && config.adultSpawn !== "auto";
  const rand = mulberry32(hashSeed(`${seed}:spawns`));

  let childSpawnId = childPinned ? config.childSpawn : vanillaSpawn("child");
  let adultSpawnId = adultPinned ? config.adultSpawn : vanillaSpawn("adult");

  if (!childPinned && shuffle) {
    childSpawnId = pickRegion(overworldSpawnRegions("child"), rand);
  }
  if (!adultPinned && shuffle) {
    adultSpawnId = pickRegion(overworldSpawnRegions("adult"), rand, childSpawnId);
  }

  if (!shuffle && !childPinned && !adultPinned && config.spawn !== "auto" && REGION_BY_ID[config.spawn]) {
    if (age === "adult") adultSpawnId = config.spawn;
    else childSpawnId = config.spawn;
  }

  return { childSpawnId, adultSpawnId };
}

export function spawnLabel(regionId: string): string {
  return REGION_BY_ID[regionId]?.name ?? regionId;
}
