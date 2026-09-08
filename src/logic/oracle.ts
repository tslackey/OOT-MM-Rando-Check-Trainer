import type { Connection, RandoConfig, Warp, WorldCheck } from "../data/types";
import { evalText } from "./eval";
import { DEFEAT_EVENTS, WARP_SONGS } from "./inventoryMap";
import { entryRegion } from "./mapPractice";
import { canExitTo, expandLocal, locationInRegion } from "./search";
import { makeState, withAge, type LogicAge, type LogicState } from "./state";
import { LOCATION_HOME } from "./worldLogic";

export function logicStateFor(
  inventory: Iterable<string>,
  age: LogicAge,
  config?: RandoConfig,
  events?: Iterable<string>,
): LogicState {
  return makeState({ age, inventory, config, events });
}

export function connectionInLogic(
  connection: Connection,
  inventory: string[],
  age: LogicAge,
  config?: RandoConfig,
  events?: Iterable<string>,
): boolean {
  const state = logicStateFor(inventory, age, config, events);
  if (entryRegion(connection.from) && entryRegion(connection.to)) {
    return canExitTo(connection.from, connection.to, state);
  }
  if (connection.age !== "any" && connection.age !== age) return false;
  const owned = new Set(inventory);
  return connection.needs.every((need) => owned.has(need) || evalText(need, state));
}

function otherAge(age: LogicAge): LogicAge {
  return age === "child" ? "adult" : "child";
}

export function otherAgeAllowed(state: LogicState, config?: RandoConfig): boolean {
  if (!config?.eitherAgeLogic) return false;
  if (config.startingAge === "adult") return true;
  return evalText("can_open_door_of_time", state);
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
  const state = logicStateFor(inventory, age, config, events);
  const ootr = check.ootrLocation;
  if (ootr && LOCATION_HOME[ootr]) {
    if (locationInRegion(ootr, currentRegionId, state)) return true;
    if (otherAgeAllowed(state, config)) {
      return locationInRegion(ootr, currentRegionId, withAge(state, otherAge(age)));
    }
    return false;
  }
  if (check.age !== "any" && check.age !== age && !otherAgeAllowed(state, config)) return false;
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
  const state = logicStateFor(inventory, age, config, events);
  return locationInRegion(ootrLocation, practiceId, state);
}

export function warpInLogic(warp: Warp, inventory: string[], age: LogicAge, config?: RandoConfig, events?: Iterable<string>): boolean {
  const spec = WARP_SONGS[warp.item];
  if (!spec) return false;
  const state = logicStateFor(inventory, age, config, events);
  if (!evalText(`can_play(${spec.song})`, state)) return false;
  if (spec.needsLeaveForest && !evalText("can_leave_forest", state)) return false;
  return true;
}

export function doorOfTimeOpen(inventory: string[], config?: RandoConfig, events?: Iterable<string>): boolean {
  const age = config?.startingAge ?? "child";
  const state = logicStateFor(inventory, age, config, events);
  if (config?.startingAge === "adult") return true;
  return evalText("can_open_door_of_time", state);
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
  const state = logicStateFor(inventory, age, config, eventsFromCollected(collectedCheckIds, extra));
  return eventsAfterVisit(practiceId, state, collectedCheckIds);
}
