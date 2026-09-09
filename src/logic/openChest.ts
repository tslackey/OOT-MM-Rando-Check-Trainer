/** Ackbar / Shipwright Shuffle Open Chest: a progressive *ability*, not a check type. */

import type { RandoConfig } from "../data/types";

export type OpenChestShuffle = "off" | "on" | "progressive";

/** Vanilla large (big brown) chests Shipwright gates with CanOpenLargeChest. */
const LARGE_CHESTS = new Set([
  "Deku Tree Slingshot Chest",
  "Deku Tree Compass Chest",
  "ZD Chest",
  "GF Chest",
  "Ice Cavern Compass Chest",
  "Graveyard Dampe Race Hookshot Chest",
]);

/** Vanilla small wooden chests. Unknown names fall through to large. */
const SMALL_CHEST_RE =
  /grotto|mido|kokiri sword|side chest|fake wall|bombable|open door|scarecrow|first room|first stalfos|basement chest|maze (left|center|right)|shield grave|royal family/i;

export function openChestShuffle(imported: Record<string, string> | undefined): OpenChestShuffle {
  const raw = (imported?.["Shuffle Open Chest"] ?? "").toLowerCase();
  if (raw.includes("progressive")) return "progressive";
  if (raw === "on" || raw === "yes" || raw === "true") return "on";
  return "off";
}

export function openChestCopies(inventory: Iterable<string>): number {
  let n = 0;
  for (const id of inventory) {
    if (id === "open_chest" || id === "open_chests") n += 1;
  }
  return n;
}

export function vanillaChestIsLarge(ootrLocation: string): boolean {
  if (LARGE_CHESTS.has(ootrLocation)) return true;
  if (SMALL_CHEST_RE.test(ootrLocation)) return false;
  return true;
}

/**
 * Graph-tool 8.3 has no Shuffle Open Chest. Overlay Ackbar's rule on Chest spots:
 * Off — innate (vanilla). On — one Open Chests opens small and large. Progressive —
 * first copy opens small chests, second opens large.
 */
export function chestAbilityAllows(
  ootrLocation: string,
  locType: string | undefined,
  inventory: Iterable<string>,
  config?: RandoConfig,
): boolean {
  if (locType !== "Chest") return true;
  const mode = openChestShuffle(config?.randoSettings);
  if (mode === "off") return true;
  const have = openChestCopies(inventory);
  if (have < 1) return false;
  if (mode === "on") return true;
  if (vanillaChestIsLarge(ootrLocation) && have < 2) return false;
  return true;
}
