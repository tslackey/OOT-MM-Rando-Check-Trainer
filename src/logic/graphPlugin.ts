import { WorldGraphFactory, type GraphPlugin } from "@mracsys/randomizer-graph-tool";
import type { RandoConfig } from "../data/types";
import { GRAPH_CACHE, GRAPH_VERSION } from "./graphCache";
import { graphItemCount, graphItemName, registerGraphItemNames } from "./graphItems";
import type { LogicAge } from "./state";

export type GraphSpot = {
  name: string;
  type?: string;
  item?: { name: string } | null;
  parent_region?: { name: string } | null;
  access_rule: (state: GraphState, opts: { spot: GraphSpot; age: string }) => boolean;
};

export type GraphExit = {
  name: string;
  rule_string?: string;
  connected_region?: { name: string } | null;
  parent_region?: { name: string } | null;
  access_rule: (state: GraphState, opts: { spot: GraphExit; age: string }) => boolean;
};

export type GraphRegionLike = {
  name: string;
  locations: GraphSpot[];
  exits: GraphExit[];
};

export type GraphState = {
  reset: () => void;
  collect: (item: { name: string }) => void;
  has: (item: string, count?: number) => boolean;
  prog_items: Record<string, number>;
};

export type GraphWorldLike = {
  settings: Record<string, unknown>;
  skipped_trials?: Record<string, boolean>;
  state: GraphState;
  collect_checked_only: boolean;
  get_region: (name: string) => GraphRegionLike;
  get_location: (name: string) => GraphSpot;
  get_entrance: (name: string) => GraphExit;
  get_locations: () => GraphSpot[];
  get_entrances: () => GraphExit[];
  get_item: (name: string) => { name: string };
};

type GraphTool = GraphPlugin & {
  worlds: GraphWorldLike[];
  item_list: { item_table: Record<string, unknown> };
  get_item: (world: GraphWorldLike, name: string) => { name: string };
};

let plugin: GraphTool | undefined;

function createPlugin(): GraphTool {
  const graph = WorldGraphFactory("ootr", { settings: { open_forest: "closed" } }, GRAPH_VERSION, GRAPH_CACHE) as GraphTool;
  if (!graph.initialized) {
    throw new Error("randomizer-graph-tool failed to initialize from the local cache");
  }
  registerGraphItemNames(Object.keys(graph.item_list.item_table));
  for (const world of graph.worlds) {
    world.collect_checked_only = true;
  }
  return graph;
}

export function graphTool(): GraphTool {
  plugin ??= createPlugin();
  return plugin;
}

function applySettings(world: GraphWorldLike, inventory: Iterable<string>, config?: RandoConfig): void {
  const owned = new Set(inventory);
  const openForest = Boolean(config?.openForest || owned.has("open_forest"));
  const openZora = Boolean(config?.openZora || owned.has("open_zora"));
  const openDot = Boolean(config?.openDoorOfTime || owned.has("open_door_of_time"));
  world.settings.open_forest = openForest ? "open" : "closed";
  world.settings.zora_fountain = openZora ? "open" : "closed";
  world.settings.open_door_of_time = openDot;
  world.settings.starting_age = config?.startingAge ?? "child";
  world.settings.shuffle_individual_ocarina_notes = false;
  world.settings.gold_skulls_ignore_daytime = false;
  if (world.skipped_trials) {
    for (const trial of Object.keys(world.skipped_trials)) world.skipped_trials[trial] = true;
  }
}

function collectNamed(world: GraphWorldLike, graph: GraphTool, name: string, count = 1): void {
  try {
    const item = graph.get_item(world, name);
    for (let i = 0; i < count; i += 1) world.state.collect(item);
  } catch {
    world.state.prog_items[name] = (world.state.prog_items[name] ?? 0) + count;
  }
}

export function prepareGraphWorld(
  inventory: Iterable<string>,
  config?: RandoConfig,
  events?: Iterable<string>,
): GraphWorldLike {
  const graph = graphTool();
  const world = graph.worlds[0];
  applySettings(world, inventory, config);
  world.state.reset();
  for (const id of inventory) {
    const name = graphItemName(id);
    if (!name) continue;
    collectNamed(world, graph, name, graphItemCount(id));
  }
  for (const event of events ?? []) {
    collectNamed(world, graph, event);
  }
  if (doorOfTimeFromGraph(world, config)) {
    world.state.prog_items["Time Travel"] = 1;
  }
  return world;
}

export function doorOfTimeFromGraph(world: GraphWorldLike, config?: RandoConfig): boolean {
  if (config?.startingAge === "adult") return true;
  if (world.settings.open_door_of_time) return true;
  try {
    const exit = world.get_entrance("Temple of Time -> Beyond Door of Time");
    return exit.access_rule(world.state, { spot: exit, age: config?.startingAge ?? "child" });
  } catch {
    return Boolean(world.state.has("Ocarina") && world.state.has("Song of Time"));
  }
}

export function otherAgeOf(age: LogicAge): LogicAge {
  return age === "child" ? "adult" : "child";
}
