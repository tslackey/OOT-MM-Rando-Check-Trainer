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
    "Deku Tree Queen Gohma Heart": "oot-deku-tree-boss-container",
    "King Dodongo": "oot-dodongo-cavern-boss",
    "Dodongos Cavern King Dodongo Heart": "oot-dodongo-cavern-boss-container",
    "Barinade": "oot-jabu-jabu-boss",
    "Jabu Jabus Belly Barinade Heart": "oot-jabu-jabu-boss-container",
    "Phantom Ganon": "oot-forest-temple-boss",
    "Forest Temple Phantom Ganon Heart": "oot-forest-temple-boss-container",
    "Forest Temple Map Chest": "oot-forest-temple-map",
    "Forest Temple Raised Island Courtyard Chest": "oot-forest-temple-garden",
    "Forest Temple Eye Switch Chest": "oot-forest-temple-maze",
    "Forest Temple Bow Chest": "oot-forest-temple-bow",
    "Forest Temple First Stalfos Chest": "oot-forest-temple-compass",
    "Forest Temple Falling Ceiling Room Chest": "oot-forest-temple-checkerboard",
    "Forest Temple Basement Chest": "oot-forest-temple-antichamber",
    "Volvagia": "oot-fire-temple-boss",
    "Fire Temple Volvagia Heart": "oot-fire-temple-boss-container",
    "Fire Temple Megaton Hammer Chest": "oot-fire-temple-hammer",
    "Fire Temple Boss Key Chest": "oot-fire-temple-boss-key-side-chest",
    "Morpha": "oot-water-temple-boss",
    "Water Temple Morpha Heart": "oot-water-temple-boss-hc",
    "Water Temple Central Pillar Chest": "oot-water-temple-under-center",
    "Bongo Bongo": "oot-shadow-temple-boss",
    "Shadow Temple Bongo Bongo Heart": "oot-shadow-temple-boss-hc",
    "Twinrova": "oot-spirit-temple-boss",
    "Spirit Temple Twinrova Heart": "oot-spirit-temple-boss-hc",
    "Link's Pocket": "oot-temple-of-time-medallion",
}

# Practice check display names -> OoTR location. Overrides fuzzy match
# (e.g. Forest Temple Map used to stick to First Room Chest; Fire Hammer
# used to stick to a crate).
NAME_TO_OOTR = {
    "Deku Theater Skull Mask": "Deku Theater Skull Mask",
    "Deku Theater Mask of Truth": "Deku Theater Mask of Truth",
    "Windmill Song of Storms": "Song from Windmill",
    "Lost Woods Skull Kid": "LW Skull Kid",
    "Kokiri Forest Kokiri Sword Chest": "KF Kokiri Sword Chest",
    "Deku Tree Boss Container": "Deku Tree Queen Gohma Heart",
    "Dodongo Cavern Boss Container": "Dodongos Cavern King Dodongo Heart",
    "Jabu-Jabu Boss Container": "Jabu Jabus Belly Barinade Heart",
    "Forest Temple Map": "Forest Temple Map Chest",
    "Forest Temple Garden": "Forest Temple Raised Island Courtyard Chest",
    "Forest Temple Maze": "Forest Temple Eye Switch Chest",
    "Forest Temple Bow": "Forest Temple Bow Chest",
    "Forest Temple Compass": "Forest Temple First Stalfos Chest",
    "Forest Temple Checkerboard": "Forest Temple Falling Ceiling Room Chest",
    "Forest Temple Antichamber": "Forest Temple Basement Chest",
    "Forest Temple Boss Container": "Forest Temple Phantom Ganon Heart",
    "Fire Temple Hammer": "Fire Temple Megaton Hammer Chest",
    "Fire Temple Boss Container": "Fire Temple Volvagia Heart",
    "Fire Temple Boss Key Side Chest": "Fire Temple Boss Key Chest",
    "Water Temple Boss HC": "Water Temple Morpha Heart",
    "Water Temple Under Center": "Water Temple Central Pillar Chest",
    "Spirit Temple Boss HC": "Spirit Temple Twinrova Heart",
    "Spirit Temple Child First Chest": "Spirit Temple Child Bridge Chest",
    "Spirit Temple Child Climb 1": "Spirit Temple Child Climb North Chest",
    "Spirit Temple Child Climb 2": "Spirit Temple Child Climb East Chest",
    "Spirit Temple Adult Lullaby": "Spirit Temple Compass Chest",
    "Spirit Temple Adult Suns on Wall 1": "Spirit Temple Map Chest",
    "Spirit Temple Adult Suns on Wall 2": "Spirit Temple Sun Block Room Chest",
    "Spirit Temple Statue Base": "Spirit Temple Statue Room Hand Chest",
    "Spirit Temple Statue Upper Right": "Spirit Temple Statue Room Northeast Chest",
    "Spirit Temple Adult Invisible 1": "Spirit Temple Hallway Left Invisible Chest",
    "Spirit Temple Adult Invisible 2": "Spirit Temple Hallway Right Invisible Chest",
    "Spirit Temple Adult Topmost Sun on Wall": "Spirit Temple Topmost Chest",
    "Shadow Temple Boss HC": "Shadow Temple Bongo Bongo Heart",
    "Shadow Temple Spinning Blades Visible": "Shadow Temple Invisible Blades Visible Chest",
    "Shadow Temple Spinning Blades Invisible": "Shadow Temple Invisible Blades Invisible Chest",
    "Shadow Temple Falling Spikes Upper 2": "Shadow Temple Falling Spikes Upper Chest",
    "Shadow Temple Invisible Spike Room": "Shadow Temple Invisible Spikes Chest",
    "Shadow Temple Wind Room Hint": "Shadow Temple Wind Hint Chest",
    "Shadow Temple After Wind": "Shadow Temple After Wind Hidden Chest",
    "Shadow Temple Boss Key Room 1": "Shadow Temple Spike Walls Left Chest",
    "Bottom of the Well Under Debris": "Bottom of the Well Front Center Bombable Chest",
    "Bottom of the Well Back West": "Bottom of the Well Front Left Fake Wall Chest",
    "Bottom of the Well East Cage": "Bottom of the Well Like Like Chest",
    "Bottom of the Well Blood Chest": "Bottom of the Well Invisible Chest",
    "Bottom of the Well Underwater 2": "Bottom of the Well Underwater Front Chest",
    "Bottom of the Well Pits": "Bottom of the Well Center Skulltula Chest",
    "Bottom of the Well Lens Side Chest": "Bottom of the Well Fire Keese Chest",
    "Ice Cavern HP": "Ice Cavern Freestanding PoH",
    "Gerudo Training Grounds Entrance 1": "Gerudo Training Ground Lobby Left Chest",
    "Gerudo Training Grounds Entrance 2": "Gerudo Training Ground Lobby Right Chest",
    "Gerudo Training Grounds Near Block": "Gerudo Training Ground Stalfos Chest",
    "Gerudo Training Grounds Behind Block Visible": "Gerudo Training Ground Beamos Chest",
    "Gerudo Training Grounds Behind Block Enemy Back": "Gerudo Training Ground Before Heavy Block Chest",
    "Gerudo Training Grounds Behind Block Enemy Front": "Gerudo Training Ground Near Scarecrow Chest",
    "Gerudo Training Maze Side Chest 1": "Gerudo Training Ground Maze Right Central Chest",
    "Gerudo Training Maze Side Chest 2": "Gerudo Training Ground Maze Right Side Chest",
    "Gerudo Training Grounds Hammer Room": "Gerudo Training Ground Hammer Room Clear Chest",
    "Gerudo Training Maze Chest 1": "Gerudo Training Ground Maze Path First Chest",
    "Gerudo Training Maze Chest 2": "Gerudo Training Ground Maze Path Second Chest",
    "Gerudo Training Maze Chest 3": "Gerudo Training Ground Maze Path Third Chest",
    "Gerudo Training Maze Chest 4": "Gerudo Training Ground Maze Path Final Chest",
    "Ganon Castle Light Chest Around 1": "Ganons Castle Light Trial First Left Chest",
    "Ganon Castle Light Chest Around 2": "Ganons Castle Light Trial Second Left Chest",
    "Ganon Castle Light Chest Around 3": "Ganons Castle Light Trial Third Left Chest",
    "Ganon Castle Light Chest Around 4": "Ganons Castle Light Trial First Right Chest",
    "Ganon Castle Light Chest Around 5": "Ganons Castle Light Trial Second Right Chest",
    "Ganon Castle Light Chest Around 6": "Ganons Castle Light Trial Third Right Chest",
    "Ganon Castle Forest Chest": "Ganons Castle Forest Trial Chest",
    "Ganon Castle Water Chest 1": "Ganons Castle Water Trial Left Chest",
    "Ganon Castle Water Chest 2": "Ganons Castle Water Trial Right Chest",
    "Ganon Castle Spirit Chest 1": "Ganons Castle Spirit Trial Crystal Switch Chest",
    "Ganon Castle Spirit Chest 2": "Ganons Castle Spirit Trial Invisible Chest",
    "Ganon Castle Shadow Chest 1": "Ganons Castle Shadow Trial Front Chest",
    "Ganon Castle Shadow Chest 2": "Ganons Castle Shadow Trial Golden Gauntlets Chest",
}

EXTRA_PROGRESSION = ["deku_shield", "skull_mask", "mask_of_truth"]

# Vanilla dungeon key counts so shuffled runs can actually open interiors.
KEY_COPIES = [
    ("small_key_forest", 5),
    ("small_key_fire", 8),
    ("small_key_water", 6),
    ("small_key_shadow", 5),
    ("small_key_spirit", 5),
    ("small_key_well", 3),
    ("small_key_gtg", 9),
    ("small_key_ganon", 2),
    ("boss_key_forest", 1),
    ("boss_key_fire", 1),
    ("boss_key_water", 1),
    ("boss_key_shadow", 1),
    ("boss_key_spirit", 1),
    ("boss_key_ganon", 1),
]

MM_PREFIXES = ("mm-",)

REWRITES = [
    ("dodongo cavern", "dodongos cavern"),
    ("jabu-jabu", "jabu jabus belly"),
    ("jabu jabu ", "jabu jabus belly "),
    ("ganon castle", "ganons castle"),
    ("ganon's castle", "ganons castle"),
    ("gerudo training grounds", "gerudo training ground"),
]


def load_ootr_locations() -> set[str]:
    names: set[str] = set()
    for path in sorted(OOTR.glob("*.json")):
        if path.name == "LogicHelpers.json":
            continue
        data = json.loads(path.read_text())
        if not isinstance(data, list):
            continue
        for region in data:
            for name in region.get("locations") or {}:
                names.add(name)
    return names


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def rewritten(name: str) -> list[str]:
    variants = [name]
    lowered = name.lower()
    for src, dest in REWRITES:
        if src in lowered:
            variants.append(re.sub(re.escape(src), dest, name, flags=re.I))
    return variants


def resolve_ootr(check: dict, locations: set[str], by_id: dict[str, list[str]]) -> str | None:
    candidates: list[str] = []
    name = check["name"]
    if name in NAME_TO_OOTR:
        candidates.append(NAME_TO_OOTR[name])
    candidates.extend(by_id.get(check["id"], []))
    for variant in rewritten(name):
        candidates.append(variant)
        if not variant.lower().endswith(("chest", "heart", "poh")):
            candidates.append(variant + " Chest")
            candidates.append(variant + " Heart")
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
    for loc in locations:
        nloc = norm(loc)
        if ncheck == nloc:
            return loc
        rest = nloc[len(ncheck) :].strip() if nloc.startswith(ncheck) else ""
        if rest in {"chest", "heart", "hc", "poh"}:
            return loc
    return None


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

    progression = [
        item
        for item in world["itemPool"]["progression"]
        if not item.endswith("_mm")
        and not item.startswith("soaring")
        and not item.startswith("small_key_")
        and not item.startswith("boss_key_")
    ]
    for item in EXTRA_PROGRESSION:
        if item not in progression:
            progression.append(item)
    for item, copies in KEY_COPIES:
        progression.extend([item] * copies)

    world["regions"] = regions
    world["connections"] = [
        edge
        for edge in world["connections"]
        if edge["from"] in region_ids and edge["to"] in region_ids and "mm-" not in edge["from"]
    ]
    world["warps"] = [
        warp for warp in world["warps"] if warp["regionId"] in region_ids and not str(warp["item"]).startswith("soaring")
    ]
    world["checks"] = checks
    world["itemPool"]["progression"] = progression
    WORLD.write_text(json.dumps(world, indent=2) + "\n")
    print(f"wrote {len(checks)} OoT checks ({matched} with ootrLocation), {len(regions)} regions -> {WORLD}")


if __name__ == "__main__":
    main()
