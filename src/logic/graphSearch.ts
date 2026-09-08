import { entryRegion, practiceIdFor } from "./mapPractice";
import type { GraphRegionLike, GraphSpot, GraphWorldLike } from "./graphPlugin";
import { otherAgeOf } from "./graphPlugin";
import type { LogicAge } from "./state";

const MAX_ITERS = 64;

function tryRegion(world: GraphWorldLike, name: string): GraphRegionLike | undefined {
  try {
    return world.get_region(name);
  } catch {
    return undefined;
  }
}

function fireEvents(world: GraphWorldLike, region: GraphRegionLike, age: LogicAge): boolean {
  let changed = false;
  for (const loc of region.locations) {
    if (loc.type !== "Event") continue;
    if (!loc.item) continue;
    if (world.state.has(loc.item.name)) continue;
    if (!loc.access_rule(world.state, { spot: loc, age })) continue;
    world.state.collect(loc.item);
    changed = true;
  }
  return changed;
}

function expandAge(world: GraphWorldLike, practiceId: string, age: LogicAge): Set<string> {
  const startName = entryRegion(practiceId);
  const seen = new Set<string>();
  if (startName && tryRegion(world, startName)) seen.add(startName);

  const root = tryRegion(world, "Root");
  if (root) fireEvents(world, root, age);

  for (let iter = 0; iter < MAX_ITERS; iter += 1) {
    let changed = false;
    for (const name of [...seen]) {
      const region = tryRegion(world, name);
      if (!region) continue;
      if (fireEvents(world, region, age)) changed = true;
      for (const exit of region.exits) {
        const dest = exit.connected_region?.name;
        if (!dest) continue;
        if (seen.has(dest)) continue;
        const destPractice = practiceIdFor(dest);
        if (destPractice !== practiceId) continue;
        if (!tryRegion(world, dest)) continue;
        if (!exit.access_rule(world.state, { spot: exit, age })) continue;
        seen.add(dest);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return seen;
}

export function expandGraphLocal(
  world: GraphWorldLike,
  practiceId: string,
  age: LogicAge,
  otherAge = false,
): Set<string> {
  let seen = expandAge(world, practiceId, age);
  if (!otherAge) return seen;
  expandAge(world, practiceId, otherAgeOf(age));
  seen = expandAge(world, practiceId, age);
  return seen;
}

export function graphLocationInRegion(
  world: GraphWorldLike,
  locationName: string,
  practiceId: string,
  age: LogicAge,
  otherAge = false,
): boolean {
  let loc: GraphSpot;
  try {
    loc = world.get_location(locationName);
  } catch {
    return false;
  }
  const home = loc.parent_region?.name;
  if (!home || practiceIdFor(home) !== practiceId) return false;
  const seen = expandGraphLocal(world, practiceId, age, otherAge);
  if (!seen.has(home)) return false;
  if (loc.access_rule(world.state, { spot: loc, age })) return true;
  if (otherAge && loc.access_rule(world.state, { spot: loc, age: otherAgeOf(age) })) return true;
  return false;
}

export function graphCanExitTo(
  world: GraphWorldLike,
  fromPractice: string,
  toPractice: string,
  age: LogicAge,
): boolean {
  if (fromPractice === toPractice) return false;
  const seen = expandGraphLocal(world, fromPractice, age, false);
  for (const name of seen) {
    const region = tryRegion(world, name);
    if (!region) continue;
    for (const exit of region.exits) {
      const dest = exit.connected_region?.name;
      if (!dest || practiceIdFor(dest) !== toPractice) continue;
      if (exit.access_rule(world.state, { spot: exit, age })) return true;
    }
  }
  return false;
}

export function graphWarpInLogic(world: GraphWorldLike, songItem: string, needsLeaveForest: boolean, age: LogicAge): boolean {
  const song = songItem.replace(/_/g, " ");
  const entranceName = `Root Exits -> ${song} Warp`;
  try {
    const exit = world.get_entrance(entranceName);
    return exit.access_rule(world.state, { spot: exit, age });
  } catch {
    if (!world.state.has("Ocarina") || !world.state.has(song)) return false;
    if (needsLeaveForest) {
      const leave = world.get_entrance("Kokiri Forest -> LW Bridge From Forest");
      return leave.access_rule(world.state, { spot: leave, age });
    }
    return true;
  }
}

export function graphEventNames(world: GraphWorldLike): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const loc of world.get_locations()) {
    if (loc.type && loc.type !== "Event") continue;
    const name = loc.item?.name;
    if (!name || seen.has(name)) continue;
    if (!world.state.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  if (world.state.has("Time Travel") && !seen.has("Time Travel")) names.push("Time Travel");
  return names;
}
