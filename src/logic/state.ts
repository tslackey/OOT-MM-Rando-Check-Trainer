import type { Age, RandoConfig } from "../data/types";
import { TRAINER_TO_OOTR, addItem } from "./inventoryMap";

export type LogicAge = Exclude<Age, "any">;

export interface LogicState {
  age: LogicAge;
  items: Map<string, number>;
  events: Set<string>;
  settings: Record<string, unknown>;
  bindings: Record<string, string>;
  /** Logic regions reached inside the current practice node. Used by `at()`. */
  reachable: Set<string>;
  /** Practice region the operator is standing in while evaluating local rules. */
  practiceId?: string;
}

const TRIALS = ["Forest", "Fire", "Water", "Shadow", "Spirit", "Light"] as const;

export function emptySettings(config?: RandoConfig, inventory: Iterable<string> = []): Record<string, unknown> {
  const owned = new Set(inventory);
  const imported = config?.randoSettings ?? {};
  const openForest = config ? config.openForest : owned.has("open_forest");
  const openZora = config ? config.openZora : owned.has("open_zora");
  const openDot = config ? config.openDoorOfTime : owned.has("open_door_of_time");

  const skipped: Record<string, boolean> = {};
  for (const trial of TRIALS) skipped[trial] = true;

  const settings: Record<string, unknown> = {
    open_forest: openForest ? "open" : "closed",
    open_kakariko: "open",
    zora_fountain: openZora ? "open" : "closed",
    open_door_of_time: openDot ? "open" : "sot",
    starting_age: config?.startingAge ?? "child",
    shuffle_dungeon_entrances: false,
    shuffle_hideout_entrances: false,
    shuffle_overworld_entrances: false,
    shuffle_gerudo_fortress_heart_piece: "remove",
    adult_trade_shuffle: Boolean(config?.checkTypes.trade),
    skip_child_zelda: false,
    free_bombchu_drops: true,
    plant_beans: false,
    hints: "none",
    gerudo_fortress: "normal",
    bridge: "vanilla",
    lacs_condition: "vanilla",
    shuffle_ganon_bosskey: "dungeon",
    dungeon_shortcuts: [],
    // Trainer default: skip Ganon trials so tower access is not a hidden lock.
    // Vanilla OoTR leaves these false; tests that care set them explicitly.
    skipped_trials: skipped,
    damage_multiplier: "normal",
    deadly_bonks: "none",
    shuffle_individual_ocarina_notes: false,
    shuffle_scrubs: config?.checkTypes.scrub ? "on" : "off",
    blue_fire_arrows: false,
    chicken_count: 7,
    warp_songs: true,
    disable_trade_revert: false,
    gold_skulls_ignore_daytime: true,
    logic_grottos_without_agony: false,
    entrance_shuffle: false,
    triforce_goal_per_world: 0,
    bridge_stones: 3,
    bridge_medallions: 6,
    bridge_rewards: 9,
    bridge_tokens: 100,
    bridge_hearts: 20,
    lacs_stones: 3,
    lacs_medallions: 6,
    lacs_rewards: 9,
    lacs_tokens: 100,
    lacs_hearts: 20,
    ganon_bosskey_stones: 3,
    ganon_bosskey_medallions: 6,
    ganon_bosskey_rewards: 9,
    ganon_bosskey_tokens: 100,
    ganon_bosskey_hearts: 20,
  };

  applyImportedSettings(settings, imported);
  if (owned.has("open_forest")) settings.open_forest = "open";
  if (owned.has("open_zora")) settings.zora_fountain = "open";
  if (owned.has("open_door_of_time")) settings.open_door_of_time = "open";
  return settings;
}

function on(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "on" || v === "yes" || v === "true";
}

function applyImportedSettings(settings: Record<string, unknown>, imported: Record<string, string>): void {
  if (!Object.keys(imported).length) return;
  if (imported["Closed Forest"]) {
    settings.open_forest = on(imported["Closed Forest"]) ? "closed" : "open";
  }
  const forest = imported["Open Forest"] ?? imported["Forest"];
  if (forest) {
    const v = forest.toLowerCase();
    if (v.includes("closed")) settings.open_forest = "closed";
    else if (v.includes("deku")) settings.open_forest = "deku";
    else settings.open_forest = "open";
  }
  if (imported["Door of Time"]) {
    const v = imported["Door of Time"].toLowerCase();
    if (v === "open") settings.open_door_of_time = "open";
    else if (v.includes("stone")) settings.open_door_of_time = "stones";
    else settings.open_door_of_time = "sot";
  }
  if (imported["Zora's Fountain"] || imported["Zoras Fountain"]) {
    const v = (imported["Zora's Fountain"] ?? imported["Zoras Fountain"] ?? "").toLowerCase();
    settings.zora_fountain = v.includes("open") ? "open" : "closed";
  }
  const start = imported["Selected Starting Age"] ?? imported["Starting Age"];
  if (start) settings.starting_age = start.toLowerCase().includes("adult") ? "adult" : "child";
  if (imported["Fortress Carpenters"]) {
    const v = imported["Fortress Carpenters"].toLowerCase();
    if (v.includes("fast")) settings.gerudo_fortress = "fast";
    else if (v.includes("open")) settings.gerudo_fortress = "open";
    else settings.gerudo_fortress = "normal";
  }
  if (imported["Rainbow Bridge"]) {
    const v = imported["Rainbow Bridge"].toLowerCase();
    if (v.includes("open")) settings.bridge = "open";
    else if (v.includes("vanilla")) settings.bridge = "vanilla";
    else if (v.includes("stone")) settings.bridge = "stones";
    else if (v.includes("medallion")) settings.bridge = "medallions";
    else if (v.includes("dungeon")) settings.bridge = "dungeons";
    else if (v.includes("token")) settings.bridge = "tokens";
    else if (v.includes("heart")) settings.bridge = "hearts";
  }
  if (imported["Ganon's Trials"]?.toLowerCase().includes("skip")) {
    const skipped = settings.skipped_trials as Record<string, boolean>;
    for (const trial of TRIALS) skipped[trial] = true;
  }
  for (const [key, value] of Object.entries(imported)) {
    if (key.startsWith("logic_") || key.toLowerCase().startsWith("enable ")) {
      const id = key.replace(/\s+/g, "_").toLowerCase();
      settings[id] = on(value);
    }
  }
}

export function makeState(opts: {
  age: LogicAge;
  inventory?: Iterable<string>;
  events?: Iterable<string>;
  config?: RandoConfig;
  settings?: Record<string, unknown>;
}): LogicState {
  const items = new Map<string, number>();
  for (const id of opts.inventory ?? []) {
    const mapped = TRAINER_TO_OOTR[id];
    if (mapped) addItem(items, mapped.name, mapped.count);
    else if (!id.startsWith("open_") && id !== "cross_game") {
      addItem(items, id.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, ""), 1);
    }
  }
  // Vanilla abilities the trainer does not shuffle.
  for (const innate of ["Climb", "Grab", "Swim", "Crawl", "Open_Chest", "Speak_Kokiri"]) {
    if (!items.has(innate)) items.set(innate, 1);
  }
  if (!opts.config?.randoSettings || (opts.config.randoSettings["Shuffle Ocarina Buttons"] ?? "Off").toLowerCase() !== "on") {
    for (const btn of ["Ocarina_A_Button", "Ocarina_C_down_Button", "Ocarina_C_right_Button", "Ocarina_C_left_Button", "Ocarina_C_up_Button"]) {
      items.set(btn, 1);
    }
  }
  return {
    age: opts.age,
    items,
    events: new Set(opts.events ?? []),
    settings: opts.settings ?? emptySettings(opts.config, opts.inventory ?? []),
    bindings: {},
    reachable: new Set(),
  };
}

export function hasItem(state: LogicState, name: string, count = 1): boolean {
  return (state.items.get(name) ?? 0) >= count;
}

export function hasEvent(state: LogicState, name: string): boolean {
  return state.events.has(name) || state.events.has(name.replaceAll("_", " "));
}

export function addEvent(state: LogicState, name: string): void {
  state.events.add(name);
}

export function withAge(state: LogicState, age: LogicAge): LogicState {
  return { ...state, age, bindings: { ...state.bindings }, reachable: new Set(state.reachable) };
}
