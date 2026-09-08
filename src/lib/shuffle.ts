import { isMajoraItem, WORLD } from "../data/world";
import type { WorldCheck } from "../data/types";

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(source: string): number {
  let h = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffleInPlace<T>(items: T[], rand: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function placeItems(checks: WorldCheck[], seed = Date.now()): Record<string, string> {
  const rand = mulberry32(hashSeed(String(seed)));
  const progression = WORLD.itemPool.progression.filter((item) => !isMajoraItem(item));
  const junk = [...WORLD.itemPool.junk];
  shuffleInPlace(progression, rand);
  shuffleInPlace(junk, rand);

  const pool = [...progression, ...junk];
  const placement: Record<string, string> = {};
  checks.forEach((check, index) => {
    placement[check.id] = pool[index] ?? `junk_${index + 1}`;
  });
  return placement;
}
