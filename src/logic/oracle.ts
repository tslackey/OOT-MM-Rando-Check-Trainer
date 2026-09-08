import type { Connection, RandoConfig, Warp, WorldCheck } from "../data/types";
import { evalText } from "./eval";
import { DEFEAT_EVENTS, WARP_SONGS } from "./inventoryMap";
import { entryRegion } from "./mapPractice";
import { canExitTo, expandLocal, locationInRegion } from "./search";
import { makeState, type LogicAge, type LogicState } from "./state";
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
    return locationInRegion(ootr, currentRegionId, state);
  }
  if (check.age !== "any" && check.age !== age) return false;
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

export function eventsAfterVisit(practiceId: string, state: LogicState): string[] {
  expandLocal(practiceId, state);
  return [...state.events];
}

export function eventsFromCollected(collectedCheckIds: Iterable<string>, extra: Iterable<string> = []): string[] {
  const events = new Set(extra);
  for (const id of collectedCheckIds) {
    const defeat = DEFEAT_EVENTS[id];
    if (defeat) events.add(defeat);
  }
  return [...events];
}
