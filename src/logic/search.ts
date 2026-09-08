import { asBool, evalRule } from "./eval";
import { PRACTICE_ENTRY, practiceIdFor } from "./mapPractice";
import type { LogicState } from "./state";
import { addEvent } from "./state";
import { REGION_BY_NAME } from "./worldLogic";

const MAX_ITERS = 24;

export function expandLocal(practiceId: string, state: LogicState): Set<string> {
  state.practiceId = practiceId;
  const start = PRACTICE_ENTRY[practiceId];
  if (start && REGION_BY_NAME[start]) state.reachable.add(start);

  for (let iter = 0; iter < MAX_ITERS; iter += 1) {
    let changed = false;
    for (const name of [...state.reachable]) {
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
        if (state.reachable.has(exit.to)) continue;
        if (!REGION_BY_NAME[exit.to]) continue;
        if (asBool(evalRule(exit.rule, state), state)) {
          state.reachable.add(exit.to);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return state.reachable;
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
