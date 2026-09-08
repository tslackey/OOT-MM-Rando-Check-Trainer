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
