import overworld from "../data/ootr/Overworld.json";
import bosses from "../data/ootr/Bosses.json";
import deku from "../data/ootr/Deku Tree.json";
import dc from "../data/ootr/Dodongos Cavern.json";
import jabu from "../data/ootr/Jabu Jabus Belly.json";
import forest from "../data/ootr/Forest Temple.json";
import fire from "../data/ootr/Fire Temple.json";
import water from "../data/ootr/Water Temple.json";
import shadow from "../data/ootr/Shadow Temple.json";
import spirit from "../data/ootr/Spirit Temple.json";
import well from "../data/ootr/Bottom of the Well.json";
import ice from "../data/ootr/Ice Cavern.json";
import gtg from "../data/ootr/Gerudo Training Ground.json";
import ganon from "../data/ootr/Ganons Castle.json";
import type { Expr } from "./rules";
import { parseRule } from "./rules";

export interface LogicRegion {
  name: string;
  dungeon?: string;
  locations: { name: string; rule: Expr; text: string }[];
  exits: { to: string; rule: Expr; text: string }[];
  events: { name: string; rule: Expr; text: string }[];
}

interface RawRegion {
  region_name: string;
  dungeon?: string;
  locations?: Record<string, string>;
  exits?: Record<string, string>;
  events?: Record<string, string>;
}

function compileRegion(raw: RawRegion): LogicRegion {
  const parse = (text: string): Expr => {
    try {
      return parseRule(text);
    } catch {
      return { type: "const", value: false };
    }
  };
  return {
    name: raw.region_name,
    dungeon: raw.dungeon,
    locations: Object.entries(raw.locations ?? {}).map(([name, text]) => ({
      name,
      text,
      rule: parse(text),
    })),
    exits: Object.entries(raw.exits ?? {}).map(([to, text]) => ({
      to,
      text,
      rule: parse(text),
    })),
    events: Object.entries(raw.events ?? {}).map(([name, text]) => ({
      name,
      text,
      rule: parse(text),
    })),
  };
}

const files = [
  overworld,
  bosses,
  deku,
  dc,
  jabu,
  forest,
  fire,
  water,
  shadow,
  spirit,
  well,
  ice,
  gtg,
  ganon,
] as RawRegion[][];

export const LOGIC_REGIONS: LogicRegion[] = files.flat().map(compileRegion);

export const REGION_BY_NAME: Record<string, LogicRegion> = Object.fromEntries(
  LOGIC_REGIONS.map((region) => [region.name, region]),
);

export const LOCATION_HOME: Record<string, { region: string; loc: LogicRegion["locations"][number] }> = {};
for (const region of LOGIC_REGIONS) {
  for (const loc of region.locations) {
    if (!LOCATION_HOME[loc.name]) LOCATION_HOME[loc.name] = { region: region.name, loc };
  }
}
