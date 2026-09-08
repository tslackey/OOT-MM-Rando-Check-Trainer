import helpersJson from "../data/ootr/LogicHelpers.json";
import { tryCompile, type CompileError } from "./compile";
import { practiceIdFor } from "./mapPractice";
import type { Expr } from "./rules";
import { parseRule } from "./rules";
import type { LogicState } from "./state";
import { hasEvent, hasItem } from "./state";

interface Helper {
  params: string[];
  body: Expr;
}

const helpers: Record<string, Helper> = {};
export const HELPER_COMPILE_ERRORS: CompileError[] = [];
for (const [key, body] of Object.entries(helpersJson as Record<string, string>)) {
  const open = key.indexOf("(");
  const name = open >= 0 ? key.slice(0, open) : key;
  const params =
    open >= 0
      ? key
          .slice(open + 1, -1)
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
  const compiled = tryCompile(body, `helper:${key}`);
  if (compiled.error) HELPER_COMPILE_ERRORS.push(compiled.error);
  helpers[name] = { params, body: compiled.expr };
}

/** Bottles recognized by OoTR `State.has_bottle`. */
const BOTTLE_ITEMS = [
  "Bottle",
  "Bottle_with_Milk",
  "Bottle_with_Red_Potion",
  "Bottle_with_Green_Potion",
  "Bottle_with_Blue_Potion",
  "Bottle_with_Fairy",
  "Bottle_with_Fish",
  "Bottle_with_Blue_Fire",
  "Bottle_with_Bugs",
  "Bottle_with_Poe",
  "Bottle_with_Big_Poe",
];

const MAX_DEPTH = 48;

export function evalRule(expr: Expr, state: LogicState, depth = 0): unknown {
  if (depth > MAX_DEPTH) return false;
  switch (expr.type) {
    case "const":
      return expr.value;
    case "name":
      return evalName(expr.name, state, depth);
    case "not":
      return !asBool(evalRule(expr.inner, state, depth + 1), state);
    case "and":
      return asBool(evalRule(expr.left, state, depth + 1), state) && asBool(evalRule(expr.right, state, depth + 1), state);
    case "or":
      return asBool(evalRule(expr.left, state, depth + 1), state) || asBool(evalRule(expr.right, state, depth + 1), state);
    case "cmp":
      if (expr.left.type === "name" && expr.right.type === "name") {
        return compare(resolveIdent(expr.left.name, state), resolveIdent(expr.right.name, state), expr.op);
      }
      return compare(evalRule(expr.left, state, depth + 1), evalRule(expr.right, state, depth + 1), expr.op);
    case "in":
      return includes(evalRule(expr.right, state, depth + 1), evalRule(expr.left, state, depth + 1));
    case "call":
      return evalCall(expr.name, expr.args, state, depth);
    case "tuple":
      if (expr.items.length === 2) {
        const item = itemName(evalRule(expr.items[0], state, depth + 1), expr.items[0]);
        const count = Number(evalRule(expr.items[1], state, depth + 1)) || 0;
        return hasResolved(state, item, count, depth + 1);
      }
      return expr.items.map((item) => evalRule(item, state, depth + 1));
    case "index": {
      const value = evalRule(expr.value, state, depth + 1);
      // OoTR writes `skipped_trials[Forest]`. Forest is a dict key, not an item.
      const index = expr.index.type === "name" ? resolveIdent(expr.index.name, state) : evalRule(expr.index, state, depth + 1);
      if (value && typeof value === "object") {
        const rec = value as Record<string, unknown>;
        return rec[String(index)];
      }
      return false;
    }
  }
}

export function evalText(rule: string, state: LogicState): boolean {
  try {
    return asBool(evalRule(parseRule(rule), state), state);
  } catch {
    return false;
  }
}

export function asBool(value: unknown, state: LogicState): boolean {
  if (typeof value === "string") {
    return hasEvent(state, value) || hasItem(state, value.replaceAll(" ", "_"));
  }
  return truthy(value);
}

export function truthy(value: unknown): boolean {
  if (value === false || value === 0 || value === "" || value == null) return false;
  return true;
}

function resolveIdent(name: string, state: LogicState): string {
  if (name in state.bindings) return resolveIdent(state.bindings[name], state);
  return name;
}

function evalName(name: string, state: LogicState, depth: number): unknown {
  if (name in state.bindings) {
    return evalName(state.bindings[name], state, depth + 1);
  }
  if (name === "is_child") return state.age === "child";
  if (name === "is_adult") return state.age === "adult";
  if (name === "has_bottle") return hasBottle(state);
  if (name === "age") return state.age;
  if (name === "True") return true;
  if (name === "False") return false;
  if (name === "at_day" || name === "at_night" || name === "at_dampe_time") return true;
  if (name.startsWith("logic_") || name.startsWith("glitch_") || name.startsWith("adv_")) {
    return Boolean(state.settings[name]);
  }
  if (hasItem(state, name)) return true;
  if (hasEvent(state, name) || hasEvent(state, name.replaceAll("_", " "))) return true;
  const helper = helpers[name];
  if (helper && helper.params.length === 0) {
    return evalRule(helper.body, state, depth + 1);
  }
  if (name in state.settings) return state.settings[name];
  return hasResolved(state, name, 1, depth + 1);
}

function evalCall(name: string, args: Expr[], state: LogicState, depth: number): unknown {
  if (name === "here" && args[0]) return evalRule(args[0], state, depth + 1);
  if (name === "at") {
    const dest = regionArg(args[0]);
    const inner = args[1] ?? { type: "const" as const, value: true };
    if (state.reachable && dest) {
      if (state.reachable.has(dest)) return evalRule(inner, state, depth + 1);
      const destPractice = practiceIdFor(dest);
      if (!destPractice || destPractice === state.searchPracticeId) return false;
    }
    return evalRule(inner, state, depth + 1);
  }
  if (name === "has_bottle") return hasBottle(state);
  if (name === "has_soul") return true;
  if (name === "has_all_notes_for_song") return !state.settings.shuffle_individual_ocarina_notes;
  if (name === "region_has_shortcuts") return false;
  if (name === "can_live_dmg") return canLiveDmg(args, state, depth);
  if (name === "has_stones") return countItems(state, ["Kokiri_Emerald", "Goron_Ruby", "Zora_Sapphire"]) >= num(evalRule(args[0], state, depth + 1));
  if (name === "has_medallions") {
    return (
      countItems(state, [
        "Forest_Medallion",
        "Fire_Medallion",
        "Water_Medallion",
        "Shadow_Medallion",
        "Spirit_Medallion",
        "Light_Medallion",
      ]) >= num(evalRule(args[0], state, depth + 1))
    );
  }
  if (name === "has_dungeon_rewards") {
    return (
      countItems(state, [
        "Kokiri_Emerald",
        "Goron_Ruby",
        "Zora_Sapphire",
        "Forest_Medallion",
        "Fire_Medallion",
        "Water_Medallion",
        "Shadow_Medallion",
        "Spirit_Medallion",
        "Light_Medallion",
      ]) >= num(evalRule(args[0], state, depth + 1))
    );
  }
  if (name === "has_hearts") return heartCount(state) >= num(evalRule(args[0], state, depth + 1));

  const helper = helpers[name];
  if (helper) {
    const next: LogicState = { ...state, bindings: { ...state.bindings } };
    helper.params.forEach((param, index) => {
      const arg = args[index];
      if (!arg) return;
      if (arg.type === "name") next.bindings[param] = state.bindings[arg.name] ?? arg.name;
      else if (arg.type === "const" && typeof arg.value === "string") next.bindings[param] = arg.value;
      else next.bindings[param] = String(evalRule(arg, state, depth + 1));
    });
    return evalRule(helper.body, next, depth + 1);
  }
  return false;
}

function hasBottle(state: LogicState): boolean {
  if (BOTTLE_ITEMS.some((name) => hasItem(state, name))) return true;
  return (state.items.get("Rutos_Letter") ?? 0) >= 2;
}

function heartCount(state: LogicState): number {
  const pieces = state.items.get("Piece_of_Heart") ?? 0;
  const containers = state.items.get("Heart_Container") ?? 0;
  return 3 + Math.floor(pieces / 4) + containers;
}

function canLiveDmg(args: Expr[], state: LogicState, depth: number): boolean {
  const hearts = num(evalRule(args[0], state, depth + 1));
  const allowRevive = args[1] ? Boolean(evalRule(args[1], state, depth + 1)) : true;
  const allowNayrus = args[2] ? Boolean(evalRule(args[2], state, depth + 1)) : true;
  const mult = String(state.settings.damage_multiplier ?? "normal");
  const nayrus = allowNayrus && hasItem(state, "Nayrus_Love") && hasItem(state, "Magic_Meter");
  const fairy = allowRevive && asBool(evalName("Fairy", state, depth + 1), state);
  if (nayrus || fairy) return true;
  if (mult === "ohko") return false;
  if (mult === "quad") return hearts < 0.75;
  if (mult === "double") return hearts < 1.5;
  if (mult === "half") return hearts < 6;
  return hearts < 3;
}

function hasResolved(state: LogicState, name: string, count: number, depth: number): boolean {
  if (hasItem(state, name, count)) return true;
  const spaced = name.replaceAll("_", " ");
  if (hasEvent(state, spaced) || hasEvent(state, name)) return true;
  const helper = helpers[name];
  if (helper && helper.params.length === 0) {
    return asBool(evalRule(helper.body, state, depth), state);
  }
  return false;
}

function itemName(value: unknown, expr: Expr): string {
  if (typeof value === "string") return value;
  if (expr.type === "name") return expr.name;
  return String(value);
}

function regionArg(expr: Expr | undefined): string {
  if (!expr) return "";
  if (expr.type === "const" && typeof expr.value === "string") return expr.value;
  if (expr.type === "name") return expr.name.replaceAll("_", " ");
  return "";
}

function countItems(state: LogicState, names: string[]): number {
  return names.reduce((sum, name) => sum + (hasItem(state, name) ? 1 : 0), 0);
}

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

function compare(left: unknown, right: unknown, op: string): boolean {
  switch (op) {
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    case "<":
      return num(left) < num(right);
    case ">":
      return num(left) > num(right);
    case "<=":
      return num(left) <= num(right);
    case ">=":
      return num(left) >= num(right);
    default:
      return false;
  }
}

function includes(haystack: unknown, needle: unknown): boolean {
  if (Array.isArray(haystack)) return haystack.includes(needle);
  if (typeof haystack === "string") return haystack.includes(String(needle));
  return false;
}
