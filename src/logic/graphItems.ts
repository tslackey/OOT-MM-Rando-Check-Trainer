import { TRAINER_TO_OOTR } from "./inventoryMap";

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const byNorm = new Map<string, string>();

export function registerGraphItemNames(names: Iterable<string>): void {
  byNorm.clear();
  for (const name of names) {
    byNorm.set(normalize(name), name);
  }
}

function guessDisplayName(raw: string): string {
  const small = raw.match(/^Small_Key_(.+)$/i);
  if (small) return `Small Key (${small[1].replace(/_/g, " ")})`;
  const boss = raw.match(/^Boss_Key_(.+)$/i);
  if (boss) return `Boss Key (${boss[1].replace(/_/g, " ")})`;
  return raw.replace(/_/g, " ");
}

/** Map a trainer id or underscore OoTR name onto a graph-tool item name. */
export function graphItemName(id: string): string | undefined {
  if (id === "open_forest" || id === "open_zora" || id === "open_door_of_time") return undefined;
  const mapped = TRAINER_TO_OOTR[id];
  const raw = mapped?.name ?? id;
  const guessed = guessDisplayName(raw);
  return byNorm.get(normalize(guessed)) ?? byNorm.get(normalize(raw)) ?? byNorm.get(normalize(id));
}

export function graphItemCount(id: string): number {
  return TRAINER_TO_OOTR[id]?.count ?? 1;
}

/** Shop/drop names 8.3 compiled helpers use instead of the equipment item. */
const SHOP_ALIASES: Record<string, string[]> = {
  "Deku Shield": ["Buy Deku Shield", "Deku Shield Drop"],
  "Hylian Shield": ["Buy Hylian Shield"],
  "Deku Nut Drop": ["Buy Deku Nut (5)", "Buy Deku Nut (10)"],
  "Deku Stick Drop": ["Buy Deku Stick (1)"],
};

export function graphItemAliases(name: string): string[] {
  return SHOP_ALIASES[name] ?? [];
}

export const INNATE_GRAPH_ITEMS = [
  "Goron Tunic",
  "Zora Tunic",
  "Ocarina A Button",
  "Ocarina C up Button",
  "Ocarina C down Button",
  "Ocarina C left Button",
  "Ocarina C right Button",
];
