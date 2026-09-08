#!/usr/bin/env python3
"""Attach OoTR location names to the OoT practice graph.

Practice regions/connections stay the coarse Go to / Check map (including
Lost Woods Bridge). In-logic penalties are evaluated from vendored OoTR World
JSON, not from keyword AND-lists. This script does not invent heuristic needs
and does not add Majora's Mask nodes.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "src/data/world.json"
OOTR = ROOT / "src/data/ootr"

LOCATION_ALIASES = {
    "KF Kokiri Sword Chest": "oot-kokiri-forest-kokiri-sword-chest",
    "KF Midos Top Left Chest": "oot-mido-s-house-top-left",
    "KF Midos Top Right Chest": "oot-mido-s-house-top-right",
    "KF Midos Bottom Left Chest": "oot-mido-s-house-bottom-left",
    "KF Midos Bottom Right Chest": "oot-mido-s-house-bottom-right",
    "KF Storms Grotto Chest": "oot-kokiri-forest-storms-grotto",
    "Song from Impa": "oot-zelda-s-song",
    "Song from Malon": "oot-lon-lon-ranch-malon-song",
    "Song from Saria": "oot-saria-s-song",
    "Song from Royal Family's Tomb": "oot-graveyard-royal-tomb-song",
    "Song from Ocarina of Time": "oot-hyrule-field-song-of-time",
    "Song from Windmill": "oot-windmill-song-of-storms",
    "Sheik in Forest": "oot-sacred-meadow-sheik-song",
    "Sheik in Crater": "oot-death-mountain-crater-sheik-song",
    "Sheik in Ice Cavern": "oot-ice-cavern-sheik-song",
    "Sheik at Colossus": "oot-desert-colossus-song-spirit",
    "Sheik in Kakariko": "oot-kakariko-song-shadow",
    "Sheik at Temple": "oot-temple-of-time-sheik-song",
    "LW Target in Woods": "oot-lost-woods-target",
    "LW Skull Kid": "oot-lost-woods-skull-kid",
    "LW Ocarina Memory Game": "oot-lost-woods-memory-game",
    "LW Near Shortcuts Grotto Chest": "oot-lost-woods-grotto-generic",
    "Deku Theater Skull Mask": "oot-deku-theater-sticks-upgrade",
    "Deku Theater Mask of Truth": "oot-deku-theater-nuts-upgrade",
    "Kak Impas House Freestanding PoH": "oot-kakariko-impa-house-hp",
    "Kak Anju as Child": "oot-kakariko-anju-bottle",
    "DMT Freestanding PoH": "oot-death-mountain-trail-hp",
    "Market Lost Dog": "oot-market-dog-lady-hp",
    "Queen Gohma": "oot-deku-tree-boss",
    "King Dodongo": "oot-dodongo-cavern-boss",
    "Barinade": "oot-jabu-jabu-boss",
    "Phantom Ganon": "oot-forest-temple-boss",
    "Volvagia": "oot-fire-temple-boss",
    "Morpha": "oot-water-temple-boss",
    "Bongo Bongo": "oot-shadow-temple-boss",
    "Twinrova": "oot-spirit-temple-boss",
    "Link's Pocket": "oot-temple-of-time-medallion",
    "Forest Temple Bow Chest": "oot-forest-temple-bow",
}

NAME_TO_OOTR = {
    "Deku Theater Skull Mask": "Deku Theater Skull Mask",
    "Deku Theater Mask of Truth": "Deku Theater Mask of Truth",
    "Windmill Song of Storms": "Song from Windmill",
    "Forest Temple Map": "Forest Temple First Room Chest",
    "Forest Temple Bow": "Forest Temple Bow Chest",
    "Lost Woods Skull Kid": "LW Skull Kid",
    "Kokiri Forest Kokiri Sword Chest": "KF Kokiri Sword Chest",
}

EXTRA_PROGRESSION = ["deku_shield", "skull_mask", "mask_of_truth"]
MM_PREFIXES = ("mm-",)


def load_ootr_locations() -> set[str]:
    names: set[str] = set()
    for path in sorted(OOTR.glob("*.json")):
        if path.name == "LogicHelpers.json":
            continue
        data = json.loads(path.read_text())
        if not isinstance(data, list):
            continue
        for region in data:
            for name in (region.get("locations") or {}):
                names.add(name)
    return names


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def resolve_ootr(check: dict, locations: set[str], by_id: dict[str, list[str]]) -> str | None:
    candidates: list[str] = []
    candidates.extend(by_id.get(check["id"], []))
    name = check["name"]
    if name in NAME_TO_OOTR:
        candidates.insert(0, NAME_TO_OOTR[name])
    candidates.append(name)
    candidates.append(name + " Chest")
    if name.startswith("LW "):
        candidates.append(name[3:])
    else:
        candidates.append("LW " + name)
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        if candidate in locations:
            return candidate
        stripped = re.sub(r"^(LW|KF|HF|Kak|SFM|DMT|DMC|GC|ZR|ZD|ZF|LH|GV|GF) ", "", candidate)
        if stripped in locations:
            return stripped
    ncheck = norm(name)
    best = None
    best_len = 0
    for loc in locations:
        nloc = norm(loc)
        if ncheck == nloc:
            return loc
        if ncheck in nloc and len(ncheck) >= 12 and len(ncheck) > best_len:
            best = loc
            best_len = len(ncheck)
    return best


def main() -> None:
    world = json.loads(WORLD.read_text())
    locations = load_ootr_locations()
    by_id: dict[str, list[str]] = {}
    for ootr, check_id in LOCATION_ALIASES.items():
        by_id.setdefault(check_id, []).append(ootr)

    regions = [region for region in world["regions"] if region.get("game") == "oot"]
    region_ids = {region["id"] for region in regions}
    checks = []
    matched = 0
    for check in world["checks"]:
        if check.get("game") != "oot" or check["id"].startswith(MM_PREFIXES):
            continue
        ootr = resolve_ootr(check, locations, by_id)
        if ootr:
            check["ootrLocation"] = ootr
            matched += 1
        elif "ootrLocation" in check:
            del check["ootrLocation"]
        checks.append(check)

    progression = [item for item in world["itemPool"]["progression"] if not item.endswith("_mm") and not item.startswith("soaring")]
    for item in EXTRA_PROGRESSION:
        if item not in progression:
            progression.append(item)

    world["regions"] = regions
    world["connections"] = [
        edge
        for edge in world["connections"]
        if edge["from"] in region_ids and edge["to"] in region_ids and "mm-" not in edge["from"]
    ]
    world["warps"] = [warp for warp in world["warps"] if warp["regionId"] in region_ids and not str(warp["item"]).startswith("soaring")]
    world["checks"] = checks
    world["itemPool"]["progression"] = progression
    WORLD.write_text(json.dumps(world, indent=2) + "\n")
    print(f"wrote {len(checks)} OoT checks ({matched} with ootrLocation), {len(regions)} regions -> {WORLD}")


if __name__ == "__main__":
    main()
