import { asBool, evalRule, evalText } from "./eval";
import { PRACTICE_ENTRY, practiceIdFor } from "./mapPractice";
import type { LogicState } from "./state";
import { addEvent, hasEvent } from "./state";
import { REGION_BY_NAME } from "./worldLogic";

const MAX_ITERS = 64;

function fireRootEvents(state: LogicState): void {
  const root = REGION_BY_NAME.Root;
  if (!root) return;
  for (const event of root.events) {
    if (!state.events.has(event.name) && asBool(evalRule(event.rule, state), state)) {
      addEvent(state, event.name);
    }
  }
}

function ensureTimeTravel(state: LogicState): void {
  if (hasEvent(state, "Time_Travel") || hasEvent(state, "Time Travel")) return;
  if (state.settings.starting_age === "adult" || state.age !== state.settings.starting_age) {
    addEvent(state, "Time_Travel");
    return;
  }
  if (evalText("can_open_door_of_time", state)) addEvent(state, "Time_Travel");
}

function canOpenDoorOfTime(state: LogicState): boolean {
  if (state.settings.starting_age === "adult") return true;
  return evalText("can_open_door_of_time", state);
}

/** Intra-practice BFS for one age. Mutates events and reachable. */
function expandAge(practiceId: string, state: LogicState): Set<string> {
  const start = PRACTICE_ENTRY[practiceId];
  const seen = new Set<string>();
  if (start && REGION_BY_NAME[start]) seen.add(start);
  state.reachable = seen;
  state.searchPracticeId = practiceId;

  for (let iter = 0; iter < MAX_ITERS; iter += 1) {
    let changed = false;
    for (const name of [...seen]) {
      const region = REGION_BY_NAME[name];
      if (!region) continue;
      for (const event of region.events) {
        if (!state.events.has(event.name) && asBool(evalRule(event.rule, state), state)) {
          addEvent(state, event.name);
          changed = true;
        }
      }
      for (const exit of region.exits) {
        const destPractice = practiceIdFor(exit.to);
        if (destPractice !== practiceId) continue;
        if (seen.has(exit.to)) continue;
        if (!REGION_BY_NAME[exit.to]) continue;
        if (asBool(evalRule(exit.rule, state), state)) {
          seen.add(exit.to);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return seen;
}

/**
 * ReachabilitySearch-style loop for one practice region: fire Root events,
 * Time Travel when the Door of Time is open, then BFS until events stop.
 * If the door is open, also fire the other age's events in this same region
 * (shared inventory) so adult windmill SoS can persist Drain Well, etc.
 */
export function expandLocal(practiceId: string, state: LogicState): Set<string> {
  ensureTimeTravel(state);
  fireRootEvents(state);
  let seen = expandAge(practiceId, state);
  if (!canOpenDoorOfTime(state)) return seen;

  const otherAge = state.age === "child" ? "adult" : "child";
  const other: LogicState = {
    ...state,
    age: otherAge,
    bindings: { ...state.bindings },
    reachable: undefined,
  };
  expandAge(practiceId, other);
  seen = expandAge(practiceId, state);
  return seen;
}

export function canExitTo(fromPractice: string, toPractice: string, state: LogicState): boolean {
  if (fromPractice === toPractice) return false;
  const reachable = expandLocal(fromPractice, state);
  for (const name of reachable) {
    const region = REGION_BY_NAME[name];
    if (!region) continue;
    for (const exit of region.exits) {
      if (practiceIdFor(exit.to) !== toPractice) continue;
      if (asBool(evalRule(exit.rule, state), state)) return true;
    }
  }
  return false;
}

export function locationInRegion(locationName: string, practiceId: string, state: LogicState): boolean {
  const reachable = expandLocal(practiceId, state);
  for (const name of reachable) {
    const region = REGION_BY_NAME[name];
    if (!region) continue;
    const loc = region.locations.find((entry) => entry.name === locationName);
    if (loc && asBool(evalRule(loc.rule, state), state)) return true;
  }
  return false;
}
