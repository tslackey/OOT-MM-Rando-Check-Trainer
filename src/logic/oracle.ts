import type { Connection, RandoConfig, Warp, WorldCheck } from "../data/types";
import { evalText } from "./eval";
import { doorOfTimeFromGraph, prepareGraphWorld } from "./graphPlugin";
import { expandGraphLocal, graphCanExitTo, graphEventNames, graphLocationInRegion, graphWarpInLogic } from "./graphSearch";
import { DEFEAT_EVENTS, WARP_SONGS } from "./inventoryMap";
import { entryRegion } from "./mapPractice";
import { expandLocal } from "./search";
import { makeState, type LogicAge, type LogicState } from "./state";

export function logicStateFor(
  inventory: Iterable<string>,
  age: LogicAge,
  config?: RandoConfig,
  events?: Iterable<string>,
): LogicState {
  return makeState({ age, inventory, config, events });
}

function eitherAgeAllowed(inventory: Iterable<string>, config?: RandoConfig, events?: Iterable<string>): boolean {
  if (!config?.eitherAgeLogic) return false;
  return doorOfTimeFromGraph(prepareGraphWorld(inventory, config, events), config);
}

export function otherAgeAllowed(state: LogicState, config?: RandoConfig): boolean {
  if (!config?.eitherAgeLogic) return false;
  if (config.startingAge === "adult") return true;
  return evalText("can_open_door_of_time", state);
}

export function connectionInLogic(
  connection: Connection,
  inventory: string[],
  age: LogicAge,
  config?: RandoConfig,
  events?: Iterable<string>,
): boolean {
  if (entryRegion(connection.from) && entryRegion(connection.to)) {
    const world = prepareGraphWorld(inventory, config, events);
    return graphCanExitTo(world, connection.from, connection.to, age);
  }
  if (connection.age !== "any" && connection.age !== age) return false;
  const owned = new Set(inventory);
  const state = logicStateFor(inventory, age, config, events);
  return connection.needs.every((need) => owned.has(need) || evalText(need, state));
}

export function checkLocationInLogic(
  check: WorldCheck,
  inventory: string[],
  age: LogicAge,
  currentRegionId: string,
  config?: RandoConfig,
  events?: Iterable<string>,
): boolean {
  if (check.regionId !== currentRegionId) return false;
  const ootr = check.ootrLocation;
  if (ootr) {
    const world = prepareGraphWorld(inventory, config, events);
    return graphLocationInRegion(world, ootr, currentRegionId, age, eitherAgeAllowed(inventory, config, events));
  }
  if (check.age !== "any" && check.age !== age && !eitherAgeAllowed(inventory, config, events)) return false;
  const owned = new Set(inventory);
  return check.needs.every((need) => owned.has(need));
}

export function locationNamedInLogic(
  ootrLocation: string,
  practiceId: string,
  inventory: string[],
  age: LogicAge,
  config?: RandoConfig,
  events?: Iterable<string>,
): boolean {
  const world = prepareGraphWorld(inventory, config, events);
  return graphLocationInRegion(world, ootrLocation, practiceId, age, false);
}

export function warpInLogic(warp: Warp, inventory: string[], age: LogicAge, config?: RandoConfig, events?: Iterable<string>): boolean {
  const spec = WARP_SONGS[warp.item];
  if (!spec) return false;
  const world = prepareGraphWorld(inventory, config, events);
  return graphWarpInLogic(world, spec.song, spec.needsLeaveForest, age);
}

export function doorOfTimeOpen(inventory: string[], config?: RandoConfig, events?: Iterable<string>): boolean {
  return doorOfTimeFromGraph(prepareGraphWorld(inventory, config, events), config);
}

export function persistableEvents(events: Iterable<string>, collectedCheckIds: Iterable<string> = []): string[] {
  const collectedDefeat = new Set<string>();
  for (const id of collectedCheckIds) {
    const defeat = DEFEAT_EVENTS[id];
    if (defeat) collectedDefeat.add(defeat);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of events) {
    if (seen.has(name)) continue;
    if (name.startsWith("Defeat ") && !collectedDefeat.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

export function eventsAfterVisit(
  practiceId: string,
  state: LogicState,
  collectedCheckIds: Iterable<string> = [],
): string[] {
  expandLocal(practiceId, state);
  return persistableEvents(state.events, collectedCheckIds);
}

export function eventsFromCollected(collectedCheckIds: Iterable<string>, extra: Iterable<string> = []): string[] {
  const events = new Set(extra);
  for (const id of collectedCheckIds) {
    const defeat = DEFEAT_EVENTS[id];
    if (defeat) events.add(defeat);
  }
  return [...events];
}

export function harvestSessionEvents(
  practiceId: string,
  inventory: string[],
  age: LogicAge,
  config: RandoConfig | undefined,
  collectedCheckIds: Iterable<string>,
  extra: Iterable<string> = [],
): string[] {
  const world = prepareGraphWorld(inventory, config, eventsFromCollected(collectedCheckIds, extra));
  const other = Boolean(config?.eitherAgeLogic && doorOfTimeFromGraph(world, config));
  expandGraphLocal(world, practiceId, age, other);
  return persistableEvents(graphEventNames(world), collectedCheckIds);
}
