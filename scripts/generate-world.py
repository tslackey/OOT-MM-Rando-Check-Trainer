#!/usr/bin/env python3
"""Generate src/data/world.json from the parsed OoTMM wiki check dump."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

WIKI = Path("/home/ubuntu/.cursor/projects/workspace/agent-tools/9d6d2ebb-3e05-4890-a0d7-7765976faab0.txt")
OUT = Path("/workspace/src/data/world.json")

SKIP_TYPES = {
    "Pot",
    "Grass",
    "Freestanding Rupee",
    "Freestanding Heart",
    "Wonder Item",
    "Hive",
    "Butterfly",
    "Crate",
    "Barrel",
    "Snowball",
    "Icicle",
    "Rock",
    "Tree",
    "Heart",
    "Rupee",
}

REGION_IDS = {
    ("OOT", "Kokiri Forest"): "oot-kokiri",
    ("OOT", "Lost Woods"): "oot-lost-woods",
    ("OOT", "Deku Theater"): "oot-deku-theater",
    ("OOT", "Sacred Forest Meadow"): "oot-sfm",
    ("OOT", "Hyrule Field"): "oot-field",
    ("OOT", "Market"): "oot-market",
    ("OOT", "Temple of Time"): "oot-tot",
    ("OOT", "Sacred Realm"): "oot-tot",
    ("OOT", "Hyrule Castle"): "oot-castle",
    ("OOT", "Outside Ganon's Castle"): "oot-ganon-out",
    ("OOT", "Lon Lon Ranch"): "oot-llr",
    ("OOT", "Kakariko"): "oot-kak",
    ("OOT", "Graveyard"): "oot-graveyard",
    ("OOT", "Death Mountain Trail"): "oot-dmt",
    ("OOT", "Goron City"): "oot-gc",
    ("OOT", "Death Mountain Crater"): "oot-dmc",
    ("OOT", "Zora's River"): "oot-zr",
    ("OOT", "Zora's Domain"): "oot-zd",
    ("OOT", "Zora's Fountain"): "oot-zf",
    ("OOT", "Lake Hylia"): "oot-lh",
    ("OOT", "Gerudo Valley"): "oot-gv",
    ("OOT", "Gerudo's Fortress"): "oot-gf",
    ("OOT", "Haunted Wasteland"): "oot-wasteland",
    ("OOT", "Desert Colossus"): "oot-colossus",
    ("OOT", "Deku Tree"): "oot-deku",
    ("OOT", "Dodongo's Cavern"): "oot-dc",
    ("OOT", "Jabu-Jabu's Belly"): "oot-jabu",
    ("OOT", "Forest Temple"): "oot-forest",
    ("OOT", "Fire Temple"): "oot-fire",
    ("OOT", "Water Temple"): "oot-water",
    ("OOT", "Shadow Temple"): "oot-shadow",
    ("OOT", "Spirit Temple"): "oot-spirit",
    ("OOT", "Bottom of the Well"): "oot-well",
    ("OOT", "Ice Cavern"): "oot-ice",
    ("OOT", "Gerudo's Training Ground"): "oot-gtg",
    ("OOT", "Ganon's Castle"): "oot-ganon",
    ("MM", "South Clock Town"): "mm-sct",
    ("MM", "North Clock Town"): "mm-nct",
    ("MM", "East Clock Town"): "mm-ect",
    ("MM", "West Clock Town"): "mm-wct",
    ("MM", "Laundry Pool"): "mm-laundry",
    ("MM", "Stock Pot Inn"): "mm-inn",
    ("MM", "Clock Tower Roof"): "mm-tower",
    ("MM", "Termina Field"): "mm-tf",
    ("MM", "Milk Road"): "mm-milk-road",
    ("MM", "Romani Ranch"): "mm-ranch",
    ("MM", "Road to Southern Swamp"): "mm-swamp-road",
    ("MM", "Southern Swamp"): "mm-swamp",
    ("MM", "Deku Palace"): "mm-palace",
    ("MM", "Woodfall"): "mm-woodfall",
    ("MM", "Woodfall Temple"): "mm-woodfall-temple",
    ("MM", "Swamp Spider House"): "mm-swamp-spider",
    ("MM", "Mountain Village"): "mm-mv",
    ("MM", "Twin Islands"): "mm-twins",
    ("MM", "Goron Village"): "mm-gv",
    ("MM", "Road to Snowhead"): "mm-snowhead-road",
    ("MM", "Snowhead Temple"): "mm-snowhead-temple",
    ("MM", "Great Bay Temple"): "mm-gbt",
    ("MM", "Great Bay Coast"): "mm-gbc",
    ("MM", "Zora Cape"): "mm-zora-cape",
    ("MM", "Zora Hall"): "mm-zora-hall",
    ("MM", "Pinnacle Rock"): "mm-pinnacle",
    ("MM", "Pirates' Fortress Exterior"): "mm-pf-ext",
    ("MM", "Pirates' Fortress Interior"): "mm-pf-int",
    ("MM", "Pirates' Fortress Sewers"): "mm-pf-sew",
    ("MM", "Ocean Spider House"): "mm-ocean-spider",
    ("MM", "Road to Ikana"): "mm-ikana-road",
    ("MM", "Ikana Graveyard"): "mm-ikana-gy",
    ("MM", "Ikana Canyon"): "mm-ikana",
    ("MM", "Ikana Castle"): "mm-ikana-castle",
    ("MM", "Beneath The Well"): "mm-ikana-well",
    ("MM", "Secret Shrine"): "mm-secret",
    ("MM", "Stone Tower"): "mm-st",
    ("MM", "Stone Tower Temple"): "mm-stt",
    ("MM", "The Moon"): "mm-moon",
    ("MM", "Giant's Dream"): "mm-woodfall-temple",
}

REGION_META = {
    "oot-kokiri": {"name": "Kokiri Forest", "game": "oot", "hub": True},
    "oot-lost-woods": {"name": "Lost Woods", "game": "oot"},
    "oot-deku-theater": {"name": "Deku Theater", "game": "oot"},
    "oot-sfm": {"name": "Sacred Forest Meadow", "game": "oot"},
    "oot-field": {"name": "Hyrule Field", "game": "oot", "hub": True},
    "oot-market": {"name": "Market", "game": "oot"},
    "oot-tot": {"name": "Temple of Time", "game": "oot"},
    "oot-castle": {"name": "Hyrule Castle", "game": "oot"},
    "oot-ganon-out": {"name": "Outside Ganon's Castle", "game": "oot"},
    "oot-llr": {"name": "Lon Lon Ranch", "game": "oot"},
    "oot-kak": {"name": "Kakariko Village", "game": "oot", "hub": True},
    "oot-graveyard": {"name": "Graveyard", "game": "oot"},
    "oot-dmt": {"name": "Death Mountain Trail", "game": "oot"},
    "oot-gc": {"name": "Goron City", "game": "oot"},
    "oot-dmc": {"name": "Death Mountain Crater", "game": "oot"},
    "oot-zr": {"name": "Zora's River", "game": "oot"},
    "oot-zd": {"name": "Zora's Domain", "game": "oot"},
    "oot-zf": {"name": "Zora's Fountain", "game": "oot"},
    "oot-lh": {"name": "Lake Hylia", "game": "oot"},
    "oot-gv": {"name": "Gerudo Valley", "game": "oot"},
    "oot-gf": {"name": "Gerudo Fortress", "game": "oot"},
    "oot-wasteland": {"name": "Haunted Wasteland", "game": "oot"},
    "oot-colossus": {"name": "Desert Colossus", "game": "oot"},
    "oot-deku": {"name": "Deku Tree", "game": "oot", "dungeon": True},
    "oot-dc": {"name": "Dodongo's Cavern", "game": "oot", "dungeon": True},
    "oot-jabu": {"name": "Jabu-Jabu's Belly", "game": "oot", "dungeon": True},
    "oot-forest": {"name": "Forest Temple", "game": "oot", "dungeon": True},
    "oot-fire": {"name": "Fire Temple", "game": "oot", "dungeon": True},
    "oot-water": {"name": "Water Temple", "game": "oot", "dungeon": True},
    "oot-shadow": {"name": "Shadow Temple", "game": "oot", "dungeon": True},
    "oot-spirit": {"name": "Spirit Temple", "game": "oot", "dungeon": True},
    "oot-well": {"name": "Bottom of the Well", "game": "oot", "dungeon": True},
    "oot-ice": {"name": "Ice Cavern", "game": "oot", "dungeon": True},
    "oot-gtg": {"name": "Gerudo Training Ground", "game": "oot", "dungeon": True},
    "oot-ganon": {"name": "Ganon's Castle", "game": "oot", "dungeon": True},
    "mm-sct": {"name": "South Clock Town", "game": "mm", "hub": True},
    "mm-nct": {"name": "North Clock Town", "game": "mm"},
    "mm-ect": {"name": "East Clock Town", "game": "mm"},
    "mm-wct": {"name": "West Clock Town", "game": "mm"},
    "mm-laundry": {"name": "Laundry Pool", "game": "mm"},
    "mm-inn": {"name": "Stock Pot Inn", "game": "mm"},
    "mm-tower": {"name": "Clock Tower Roof", "game": "mm"},
    "mm-tf": {"name": "Termina Field", "game": "mm", "hub": True},
    "mm-milk-road": {"name": "Milk Road", "game": "mm"},
    "mm-ranch": {"name": "Romani Ranch", "game": "mm"},
    "mm-swamp-road": {"name": "Road to Southern Swamp", "game": "mm"},
    "mm-swamp": {"name": "Southern Swamp", "game": "mm"},
    "mm-palace": {"name": "Deku Palace", "game": "mm"},
    "mm-woodfall": {"name": "Woodfall", "game": "mm"},
    "mm-woodfall-temple": {"name": "Woodfall Temple", "game": "mm", "dungeon": True},
    "mm-swamp-spider": {"name": "Swamp Spider House", "game": "mm", "dungeon": True},
    "mm-mv": {"name": "Mountain Village", "game": "mm"},
    "mm-twins": {"name": "Twin Islands", "game": "mm"},
    "mm-gv": {"name": "Goron Village", "game": "mm"},
    "mm-snowhead-road": {"name": "Path to Snowhead", "game": "mm"},
    "mm-snowhead-temple": {"name": "Snowhead Temple", "game": "mm", "dungeon": True},
    "mm-gbt": {"name": "Great Bay Temple", "game": "mm", "dungeon": True},
    "mm-gbc": {"name": "Great Bay Coast", "game": "mm"},
    "mm-zora-cape": {"name": "Zora Cape", "game": "mm"},
    "mm-zora-hall": {"name": "Zora Hall", "game": "mm"},
    "mm-pinnacle": {"name": "Pinnacle Rock", "game": "mm"},
    "mm-pf-ext": {"name": "Pirates' Fortress Exterior", "game": "mm"},
    "mm-pf-int": {"name": "Pirates' Fortress Interior", "game": "mm", "dungeon": True},
    "mm-pf-sew": {"name": "Pirates' Fortress Sewers", "game": "mm", "dungeon": True},
    "mm-ocean-spider": {"name": "Ocean Spider House", "game": "mm", "dungeon": True},
    "mm-ikana-road": {"name": "Road to Ikana", "game": "mm"},
    "mm-ikana-gy": {"name": "Ikana Graveyard", "game": "mm"},
    "mm-ikana": {"name": "Ikana Canyon", "game": "mm"},
    "mm-ikana-castle": {"name": "Ancient Castle of Ikana", "game": "mm", "dungeon": True},
    "mm-ikana-well": {"name": "Beneath The Well", "game": "mm", "dungeon": True},
    "mm-secret": {"name": "Secret Shrine", "game": "mm", "dungeon": True},
    "mm-st": {"name": "Stone Tower", "game": "mm"},
    "mm-stt": {"name": "Stone Tower Temple", "game": "mm", "dungeon": True},
    "mm-moon": {"name": "The Moon", "game": "mm"},
}


def slug(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def classify(name: str, typ: str) -> str:
    t = typ.split("(")[0].strip()
    if t == "Song" or "Song" in name or name in {"Darunia", "Oath to Order", "Goron Elder", "Goron Baby"}:
        if "Song" in name or t == "Song" or name in {"Darunia", "Oath to Order", "Goron Elder", "Goron Baby"}:
            if t == "Song" or name.endswith("Song") or "Song of" in name or name in {
                "Saria's Song",
                "Zelda's Song",
                "Oath to Order",
                "Goron Elder",
                "Goron Baby",
                "Darunia",
            }:
                return "song"
    if t == "Dungeon Reward" or name.endswith(" Boss") or name == "Temple of Time Medallion":
        return "dungeonReward"
    if "Scrub" in typ or "Scrub" in name:
        return "scrub"
    if t.startswith("Shop") or "Shop" in name and "Bomb Shop" in name or "Curiosity Shop" in name:
        return "shop"
    if "Skulltula House" in name or "Skulltulla" in name:
        return "skullReward"
    trade_bits = (
        "Odd Mushroom",
        "Poacher's Saw",
        "Prescription",
        "Claim Check",
        "Biggoron",
        "Cojiro",
        "Odd Potion",
        "Eyeball Frog",
        "Eye Drops",
        "Broken Goron Sword",
        "Anju Egg",
        "Kafei",
        "Pendant",
        "Letter to Kafei",
        "Couple's Mask",
    )
    if any(b in name for b in trade_bits):
        return "trade"
    return "chest"


def needs_for(name: str, region_id: str, check_type: str) -> tuple[str, list[str]]:
    """Return (age, needs). age is child|adult|any."""
    age = "any"
    needs: list[str] = []
    n = name.lower()

    adult_regions = {
        "oot-forest",
        "oot-fire",
        "oot-water",
        "oot-shadow",
        "oot-gtg",
        "oot-ganon",
        "oot-ganon-out",
        "oot-wasteland",
        "oot-gf",
        "oot-ice",
    }
    child_regions = {"oot-deku", "oot-jabu", "oot-well", "oot-castle"}

    if region_id in adult_regions:
        age = "adult"
    if region_id in child_regions:
        age = "child"

    if any(x in n for x in ["adult", "sheik", "biggoron", "claim check", "prescription", "poacher", "odd mushroom", "medigoron"]):
        age = "adult"
    if "shooting gallery adult" in n or "fishing pond adult" in n:
        age = "adult"
    if any(x in n for x in ["child", "frogs", "skull kid", "deku theater", "malon egg", "zelda", "kokiri sword", "bomb bag"]):
        age = "child"
        if "goron city bomb bag" in n:
            age = "any"
    if "kokiri sword" in n or "mido's house" in n:
        age = "child"
    if "saria's song" in n or "lost woods skull kid" in n:
        age = "child"
    if "lost woods target" in n or "lost woods memory" in n:
        age = "child"
    if "deku theater" in n:
        age = "child"
    if "talon" in n or "malon song" in n:
        age = "child"
    if "jabu" in n:
        age = "child"
    if "spirit temple child" in n or "silver gauntlets" in n:
        age = "child"
    if "spirit temple adult" in n or "mirror shield" in n and "spirit" in n:
        age = "adult"
    if "well" in n and "oot-well" == region_id:
        age = "child"

    storms = "storms grotto" in n or "song of storms" in n or n.endswith("storms")
    if storms and "frogs" not in n:
        needs.append("song_of_storms")
    if "song of time" in n and region_id == "oot-field":
        needs.append("ocarina")
    if "saria" in n:
        needs.append("ocarina")
    if "epona" in n:
        needs.append("ocarina")
    if "hookshot" in n or "longshot" in n:
        needs.append("hookshot")
    if "bow" in n and "bombchu bowling" not in n:
        needs.append("bow")
    if "hammer" in n:
        needs.append("hammer")
    if "iron boots" in n or "underwater" in n and region_id in {"oot-water", "oot-lh", "oot-zf"}:
        if "bottle" in n:
            needs.append("silver_scale")
        elif "iron" in n or "bottom hp" in n:
            needs.append("iron_boots")
    if "hover boots" in n:
        needs.append("hover_boots")
    if "lens" in n:
        needs.append("lens")
    if "boomerang" in n:
        needs.append("boomerang")
    if "fire arrow" in n:
        needs.append("bow")
        needs.append("magic")
    if "light arrows" in n:
        needs.append("adult")
    if "magic upgrade" in n or "din's fire" in n or "farore" in n or "nayru" in n:
        needs.append("magic")
    if "skulltula house" in n:
        needs.append("gs_tokens")
    if "big poe" in n:
        needs.append("bow")
        age = "adult"
    if "gerudo fortress archery" in n:
        needs.append("bow")
        needs.append("epona")
    if "bombchu bowling" in n:
        needs.append("bombs")
    if region_id == "oot-forest":
        needs.append("hookshot")
        age = "adult"
    if region_id == "oot-fire":
        age = "adult"
    if region_id == "oot-water":
        needs.append("iron_boots")
        age = "adult"
    if region_id == "oot-shadow":
        age = "adult"
    if region_id == "mm-woodfall-temple":
        needs.append("deku_mask")
        needs.append("bow")
    if region_id == "mm-snowhead-temple":
        needs.append("goron_mask")
    if region_id == "mm-gbt":
        needs.append("zora_mask")
        needs.append("hookshot")
    if region_id == "mm-gbc" and "zora mask" not in n:
        pass
    if "zora mask" in n:
        needs.append("song_of_healing")
    if region_id in {"mm-pf-ext", "mm-pf-int", "mm-pf-sew", "mm-zora-cape", "mm-zora-hall", "mm-pinnacle"}:
        needs.append("zora_mask")
    if region_id in {"mm-st", "mm-stt", "mm-ikana", "mm-ikana-castle", "mm-ikana-well", "mm-secret"}:
        needs.append("elegy")
    if region_id == "mm-moon":
        needs.append("oath")
        needs.append("odolwa")
        needs.append("goht")
        needs.append("gyorg")
        needs.append("twinmold")
    if "powder keg" in n:
        needs.append("goron_mask")
    if "goron village" in region_id or region_id in {"mm-mv", "mm-twins", "mm-gv", "mm-snowhead-road"}:
        if region_id != "mm-mv":
            pass

    # unique-ify while preserving order
    seen = set()
    clean = []
    for item in needs:
        if item not in seen and item != "adult":
            seen.add(item)
            clean.append(item)
    return age, clean


def parse_rows():
    rows = []
    for line in WIKI.read_text().splitlines():
        if not line.startswith("| OOT") and not line.startswith("| MM"):
            continue
        parts = [p.strip() for p in line.strip().strip("|").split("|")]
        if len(parts) < 4:
            continue
        game, region, name, typ = parts[:4]
        rest = parts[4:]
        always = next((x for x in rest if x in ("Yes", "No")), "?")
        if always != "Yes":
            continue
        if "MQ" in name:
            continue
        if typ.split("(")[0].strip() in SKIP_TYPES:
            continue
        rows.append((game, region, name, typ))
    return rows


def connections():
    def edge(a, b, **req):
        return {"from": a, "to": b, **req}

    pairs = [
        # OoT overworld
        ("oot-kokiri", "oot-lost-woods"),
        ("oot-lost-woods", "oot-deku-theater", {"age": "child"}),
        ("oot-kokiri", "oot-deku", {"needs": ["open_deku"]}),
        ("oot-lost-woods", "oot-sfm"),
        ("oot-lost-woods", "oot-field", {"needs": ["open_forest"]}),
        ("oot-sfm", "oot-forest", {"needs": ["hookshot"], "age": "adult"}),
        ("oot-field", "oot-market"),
        ("oot-field", "oot-llr"),
        ("oot-field", "oot-kak"),
        ("oot-field", "oot-lh"),
        ("oot-field", "oot-gv"),
        ("oot-field", "oot-zr"),
        ("oot-market", "oot-tot"),
        ("oot-market", "oot-castle", {"age": "child"}),
        ("oot-market", "oot-ganon-out", {"age": "adult"}),
        ("oot-ganon-out", "oot-ganon", {"age": "adult", "needs": ["light_arrows"]}),
        ("oot-kak", "oot-graveyard"),
        ("oot-kak", "oot-dmt"),
        ("oot-kak", "oot-well", {"age": "child", "needs": ["song_of_storms"]}),
        ("oot-graveyard", "oot-shadow", {"age": "adult", "needs": ["nocturne"]}),
        ("oot-dmt", "oot-gc"),
        ("oot-dmt", "oot-dc"),
        ("oot-gc", "oot-dmc"),
        ("oot-dmc", "oot-fire", {"age": "adult"}),
        ("oot-zr", "oot-zd", {"needs": ["open_zora"]}),
        ("oot-zd", "oot-zf"),
        ("oot-zf", "oot-jabu", {"age": "child"}),
        ("oot-zf", "oot-ice", {"age": "adult"}),
        ("oot-lh", "oot-water", {"age": "adult", "needs": ["iron_boots"]}),
        ("oot-gv", "oot-gf", {"age": "adult"}),
        ("oot-gf", "oot-gtg", {"age": "adult", "needs": ["gerudo_card"]}),
        ("oot-gf", "oot-wasteland", {"age": "adult", "needs": ["hookshot"]}),
        ("oot-wasteland", "oot-colossus", {"age": "adult"}),
        ("oot-colossus", "oot-spirit"),
        # MM clock town
        ("mm-sct", "mm-nct"),
        ("mm-sct", "mm-ect"),
        ("mm-sct", "mm-wct"),
        ("mm-sct", "mm-laundry"),
        ("mm-sct", "mm-tower"),
        ("mm-sct", "mm-tf"),
        ("mm-ect", "mm-inn"),
        ("mm-tf", "mm-milk-road"),
        ("mm-tf", "mm-swamp-road"),
        ("mm-tf", "mm-mv", {"needs": ["bow"]}),
        ("mm-tf", "mm-gbc", {"needs": ["zora_mask"]}),
        ("mm-tf", "mm-ikana-road", {"needs": ["hookshot"]}),
        ("mm-milk-road", "mm-ranch", {"needs": ["epona"]}),
        ("mm-swamp-road", "mm-swamp"),
        ("mm-swamp", "mm-palace"),
        ("mm-swamp", "mm-swamp-spider"),
        ("mm-swamp", "mm-woodfall", {"needs": ["deku_mask"]}),
        ("mm-woodfall", "mm-woodfall-temple", {"needs": ["sonata"]}),
        ("mm-mv", "mm-twins"),
        ("mm-twins", "mm-gv"),
        ("mm-gv", "mm-snowhead-road", {"needs": ["goron_mask"]}),
        ("mm-snowhead-road", "mm-snowhead-temple", {"needs": ["lullaby"]}),
        ("mm-gbc", "mm-zora-cape"),
        ("mm-gbc", "mm-pinnacle", {"needs": ["seahorse"]}),
        ("mm-gbc", "mm-ocean-spider"),
        ("mm-gbc", "mm-pf-ext"),
        ("mm-zora-cape", "mm-zora-hall"),
        ("mm-zora-cape", "mm-gbt", {"needs": ["nwbn"]}),
        ("mm-pf-ext", "mm-pf-int"),
        ("mm-pf-ext", "mm-pf-sew"),
        ("mm-ikana-road", "mm-ikana-gy"),
        ("mm-ikana-road", "mm-ikana", {"needs": ["garo_mask"]}),
        ("mm-ikana", "mm-ikana-castle"),
        ("mm-ikana", "mm-ikana-well"),
        ("mm-ikana", "mm-secret"),
        ("mm-ikana", "mm-st"),
        ("mm-st", "mm-stt", {"needs": ["elegy"]}),
        ("mm-sct", "mm-moon", {"needs": ["oath", "odolwa", "goht", "gyorg", "twinmold"]}),
        # Cross-game via Clock Town <-> Temple of Time / Lost Woods (OoTMM)
        ("oot-tot", "mm-sct", {"needs": ["cross_game"]}),
        ("oot-lost-woods", "mm-tf", {"needs": ["cross_game"]}),
    ]
    out = []
    for item in pairs:
        if len(item) == 2:
            a, b = item
            extra = {}
        else:
            a, b, extra = item
        out.append({"from": a, "to": b, "needs": extra.get("needs", []), "age": extra.get("age", "any")})
        out.append({"from": b, "to": a, "needs": extra.get("needs", []), "age": extra.get("age", "any")})
    return out


def warp_points():
    return [
        {"item": "minuet", "regionId": "oot-sfm", "label": "Minuet of Forest"},
        {"item": "bolero", "regionId": "oot-dmc", "label": "Bolero of Fire"},
        {"item": "serenade", "regionId": "oot-lh", "label": "Serenade of Water"},
        {"item": "nocturne", "regionId": "oot-graveyard", "label": "Nocturne of Shadow"},
        {"item": "requiem", "regionId": "oot-colossus", "label": "Requiem of Spirit"},
        {"item": "prelude", "regionId": "oot-tot", "label": "Prelude of Light"},
        {"item": "soaring", "regionId": "mm-sct", "label": "Song of Soaring (Clock Town)"},
        {"item": "soaring-woodfall", "regionId": "mm-woodfall", "label": "Soar to Woodfall"},
        {"item": "soaring-snowhead", "regionId": "mm-snowhead-road", "label": "Soar to Snowhead"},
        {"item": "soaring-gbc", "regionId": "mm-gbc", "label": "Soar to Great Bay"},
        {"item": "soaring-ikana", "regionId": "mm-ikana", "label": "Soar to Ikana"},
    ]


def item_pool():
    progression = [
        "kokiri_sword",
        "slingshot",
        "bombs",
        "bow",
        "hookshot",
        "longshot",
        "hammer",
        "boomerang",
        "lens",
        "iron_boots",
        "hover_boots",
        "strength",
        "silver_scale",
        "golden_scale",
        "magic",
        "dins",
        "farores",
        "nayrus",
        "fire_arrows",
        "light_arrows",
        "ocarina",
        "song_of_time",
        "song_of_storms",
        "saria",
        "epona",
        "suns_song",
        "zelda_lullaby",
        "minuet",
        "bolero",
        "serenade",
        "nocturne",
        "requiem",
        "prelude",
        "gerudo_card",
        "bottle",
        "deku_mask",
        "goron_mask",
        "zora_mask",
        "song_of_healing",
        "soaring",
        "sonata",
        "lullaby",
        "nwbn",
        "elegy",
        "oath",
        "bow_mm",
        "hookshot_mm",
        "fire_arrow",
        "ice_arrow",
        "light_arrow",
        "mirror_shield",
        "powder_keg",
        "lens_mm",
        "garo_mask",
        "stone_mask",
        "seahorse",
        "room_key",
        "letter_kafei",
        "kokiri_emerald",
        "goron_ruby",
        "zora_sapphire",
        "forest_medallion",
        "fire_medallion",
        "water_medallion",
        "shadow_medallion",
        "spirit_medallion",
        "light_medallion",
        "odolwa",
        "goht",
        "gyorg",
        "twinmold",
    ]
    junk = [f"junk_{i}" for i in range(1, 80)]
    return {"progression": progression, "junk": junk}


def main():
    rows = parse_rows()
    checks = []
    seen_ids = set()
    for game, region, name, typ in rows:
        region_id = REGION_IDS.get((game, region))
        display_name = name
        if "deku theater" in name.lower():
            region_id = "oot-deku-theater"
            if "sticks" in name.lower():
                display_name = "Deku Theater Skull Mask"
            elif "nuts" in name.lower():
                display_name = "Deku Theater Mask of Truth"
        if not region_id:
            print("MISSING REGION", game, region, name)
            continue
        cid = slug(f"{game} {name}")
        if cid in seen_ids:
            cid = slug(f"{game} {region} {name}")
        seen_ids.add(cid)
        check_type = classify(name, typ)
        age, needs = needs_for(name, region_id, check_type)
        checks.append(
            {
                "id": cid,
                "name": display_name,
                "game": game.lower(),
                "regionId": region_id,
                "type": check_type,
                "age": age,
                "needs": needs,
            }
        )

    regions = []
    for rid, meta in REGION_META.items():
        regions.append({"id": rid, **meta})

    world = {
        "regions": regions,
        "connections": connections(),
        "warps": warp_points(),
        "checks": checks,
        "itemPool": item_pool(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(world, indent=2) + "\n")
    print(f"wrote {len(checks)} checks, {len(regions)} regions -> {OUT}")


if __name__ == "__main__":
    main()
