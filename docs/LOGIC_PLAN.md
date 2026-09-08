# Plan: replace heuristic logic with a real OoT randomizer solver

This is the implementation plan for practice “in logic” penalties. It is based on how
[OoT-Randomizer](https://github.com/OoTRandomizer/OoT-Randomizer) and Ship of
Harkinian’s randomizer
([HarbourMasters/Shipwright](https://github.com/HarbourMasters/Shipwright))
actually compute reachability.

**This document is the plan. Do not treat `src/data/world.json` as official
logic until a later phase lands and tests prove it.**

## Why the current logic is wrong

Today’s graph is not a randomizer solver. `scripts/generate-world.py` builds
`src/data/world.json` from a wiki check dump plus name-keyword heuristics:

- If the check name contains `"hookshot"`, require hookshot.
- If the region is Forest Temple, require hookshot + adult for **every** check
  in the dungeon.
- If the name contains `"song of storms"`, require Song of Storms — including
  **Windmill Song of Storms**, which is how you *learn* the song.
- Deku Theater Skull Mask / Mask of Truth have empty `needs[]`. Real logic
  requires the corresponding mask as child.
- Ganon’s Castle entrance requires Light Arrows. Real logic uses rainbow
  bridge / trials / boss key settings, not “have Light Arrows to walk in.”
- Bottom of the Well is child + Song of Storms only. Real logic also drains
  the well as adult from the windmill.
- Connections are a coarse overworld (one node per area). Forest Temple is one
  region, so First Room Chest and Phantom Ganon share the same requirement.

The evaluator in `src/data/world.ts` is `hasAll(inventory, needs)` plus a
single age flag. That is an AND-list of item ids. Real randomizers evaluate
boolean expressions with helpers, events, item counts, settings, and (for
fill) both ages at once.

`shuffle.ts` also does not generate a beatable seed. It permutes the
progression pool onto enabled checks. Imported spoilers are the only placements
that are already known-legal.

## What to study (and what not to copy)

### 1. OoT-Randomizer (preferred source of truth for this app)

Repo: https://github.com/OoTRandomizer/OoT-Randomizer (MIT)

| Piece | Where | What it does |
| --- | --- | --- |
| World graph | `data/World/*.json` | Regions with `locations`, `exits`, `events`. Rules are Python-like strings. |
| Helpers | `data/LogicHelpers.json` | Shared predicates: `can_use(item)`, `has_explosives`, `can_leave_forest`, `can_play(song)`, … |
| Parser | `RuleParser.py` | Compiles rule strings into access lambdas. Expands helpers. Supports `here()` / `at()`. |
| State | `State.py` | Item counts (`solv_items`), not a boolean bag. `has(item, n)`, progressive aliases. |
| Search | `Search.py` | Dual-age BFS. Child and adult region sets expand independently. Collects reachable items in spheres. |
| Settings rules | `Rules.py` | Shop/item restrictions after entrance setup. |

Kokiri Forest in `data/World/Overworld.json` looks like:

```text
region_name: Kokiri Forest
events:
  "Showed Mido Sword & Shield": is_child and Kokiri_Sword and Deku_Shield
locations:
  "KF Kokiri Sword Chest": is_child
exits:
  "KF Outside Deku Tree": is_adult or open_forest == 'open' or 'Showed Mido Sword & Shield'
  "LW Bridge From Forest": can_leave_forest
```

`can_leave_forest` is not “open forest flag.” It is:

```text
open_forest != 'closed' or is_adult or 'Defeat Queen Gohma' or (glitch escapes…)
```

Forest Temple is many regions (`Forest Temple Lobby`, `Central Area`,
`Block Push Room`, …) with small keys, bow events (`Forest Temple Jo and
Beth`), and `at('Other Region', rule)` cross-checks. First Room Chest is
`True` once you are in the lobby. That is the opposite of our “whole dungeon
needs hookshot.”

Windmill song is `Song from Windmill: is_adult and Ocarina`.

Deku Theater is `is_child and Skull_Mask` / `is_child and Mask_of_Truth`.

### 2. Ship of Harkinian / Shipwright (same idea, C++ 3drando port)

Repo: https://github.com/HarbourMasters/Shipwright

SoH is the PC port. Its randomizer is a port of **3drando**, not a second
logic language. Same graph, compiled into lambdas:

- `soh/soh/Enhancements/randomizer/location_access.h` — `Region` with events,
  locations, exits; child/adult × day/night access bits.
- `location_access/overworld/kokiri_forest.cpp` — one area table per overworld
  scene (`RR_KOKIRI_FOREST`, `RR_KF_OUTSIDE_DEKU_TREE`, grottos, houses).
- `3drando/fill.cpp` — `ReachabilitySearch` loops `ProcessRegion` until
  `logicUpdated` is false. Events can unlock more exits in the same search.
  Time travel is propagated through Temple of Time.
- Check tracker calls the same `ReachabilitySearch` to mark available checks.

Do **not** port the C++ into this Vite app. Use it as a second reading of the
same algorithm, and as the reference for SoH-specific settings if we ever
import SoH spoilers.

### 3. Other repos (out of scope)

- **OoTMM** / this repo’s leftover `mm-*` nodes — Majora’s Mask stays a
  separate app. Strip remaining MM from world data when the generator is
  replaced.
- **2ship2harkinian** — MM port. Same story.
- **Archipelago OoT** — derived from OoTR. Not a better source than upstream.

## Two graphs (do not collapse them)

Randomizers search hundreds of subregions. The trainer UI must stay walkable:
**Go to Lost Woods**, not **Go to LW Beyond Mido**.

Keep two layers:

1. **Practice graph** (operator buttons) — coarse regions, same shape as
   today’s `world.json` regions + connections + warps. One node per overworld
   area / dungeon. Age swap still happens at Temple of Time.
2. **Logic graph** (penalty oracle) — OoTR regions, exits, locations, events,
   helpers. Used only to answer “is this travel / check in logic given
   inventory, settings, and current age?”

Map every logic region and every location to exactly one practice region
(`"Forest Temple Lobby"` → `oot-forest`, `"Deku Theater"` → `oot-deku-theater`).

Practice buttons stay visually identical. `hideLocked` / `hideCompleted` remain
the only easier-mode tells. Peek still costs `peekPenaltySeconds`.

## What “in logic” means during a run

Fill-time search (OoTR `Search`, SoH `ReachabilitySearch`) explores **both
ages** from Root, collecting items, until nothing new opens. That is how seeds
are proven beatable.

A practice run is different: the operator is in **one** practice region as
**one** age. Penalties should match “could I do this *here, now*, with what I
have,” not “is this check somewhere in the sphere-0 playthrough.”

Rules:

| Action | Stay here | In logic if |
| --- | --- | --- |
| **Go to B** | B is an adjacent practice exit (unchanged UI) | Current age + inventory satisfy at least one logic exit from a logic region inside the current practice region that lands in B. |
| **Check L** | L’s practice region is the current region | Current age + inventory satisfy L’s access rule **and** the operator could reach L’s logic region from the current practice region without leaving it. |
| **Warp** | Song owned + ocarina (today) | `can_play(song)` under helpers, plus `can_leave_forest` where OoTR requires it (Prelude / Bolero / etc.). |
| **Age swap** | Temple of Time | `can_open_door_of_time` from helpers + settings, not only SoT + ocarina. |

Do **not** require a full dual-age world search for every tap in phase 1.
Evaluate the local rule. Add dual-age / event search in phase 3 so “Defeat
Queen Gohma” can open the forest as child without the open-forest setting.

Out-of-logic still only adds penalty seconds. It does not restyle the button.

## Inventory and settings

Replace the string bag with a counted state, aliased to OoTR names:

| Trainer id (today) | OoTR |
| --- | --- |
| `hookshot` / `longshot` | `Progressive_Hookshot` count 1 / 2 |
| `strength` | `Progressive_Strength_Upgrade` |
| `silver_scale` / `golden_scale` | `Progressive_Scale` |
| `bombs` | `Bomb_Bag` |
| `ocarina` | `Ocarina` (count 2 = Ocarina of Time when settings care) |
| `open_forest` fake item | setting `open_forest` (`closed` / `open` / Deku-only) |

Imported `randoSettings` must feed the rule context (`Closed Forest`,
`Door of Time`, starting age, tricks off by default). `flagsFor()` injecting
fake items is a stopgap; settings belong on the logic context, not in
inventory.

Events are not items. Collecting a dungeon reward should set
`'Defeat Queen Gohma'` (and similar) so `can_leave_forest` can become true
mid-run.

Trade sequence and bottles need counts later; phase 1 can keep “has bottle”
as a boolean.

## Architecture to build

```text
src/logic/
  rules.ts          # tokenize + AST + eval (and / or / not / calls / comparisons)
  helpers.ts        # vendored subset of LogicHelpers.json
  state.ts          # item counts, age, events, settings
  search.ts         # later: dual-age region expansion
  worldLogic.ts     # loaded OoTR regions/exits/locations
  mapPractice.ts    # logic region/location → practice regionId
  inventoryMap.ts   # trainer item ids ↔ OoTR names

src/data/
  world.json        # PRACTICE graph only (OoT, no MM)
  ootr/             # vendored vanilla World JSON + LogicHelpers (MIT notice)
```

`checkInLogic` / `canUseConnection` in `src/data/world.ts` become thin
wrappers around `src/logic`. Session mutations in `src/lib/session.ts` stay
the same shape.

Replace `scripts/generate-world.py` (wiki dump + `needs_for()`) with a
generator that:

1. Reads vendored OoTR `data/World` (vanilla files only; skip `* MQ.json`
   until a later phase).
2. Builds the practice region list + adjacency from a small explicit map
   (Lost Woods ↔ Kokiri, SFM ↔ Forest Temple, …), **not** from keyword
   matching.
3. Emits location → practice region + OoTR location name for import aliases.
4. Does not invent AND-lists.

Keep `importRando.ts` location names aligned with OoTR (`KF Kokiri Sword
Chest`, `Deku Theater Skull Mask`, …). That already matches spoilers.

License: copy the MIT notice from OoT-Randomizer next to vendored JSON.

## Phases

### Phase 0 — freeze the lie (small)

- Document known-wrong fixtures as tests that **today fail** or that assert
  the heuristic so later phases can flip them.
- Stop generating MM nodes, MM warps, and `cross_game` edges. Practice is OoT
  only; leftover MM in `world.json` / `ITEM_LABELS` / `generate-world.py` is
  leftover combo data.
- Do not claim “official logic” in UI copy.

### Phase 1 — boolean rules on the coarse graph (first real improvement)

Goal: checks and exits use expressions, not `needs: string[]`.

- Vendor `LogicHelpers.json` + vanilla World JSON.
- Implement a **restricted** rule language: `and` / `or` / `not`, item names,
  `(Item, n)`, `is_child` / `is_adult`, setting equality, helper expansion.
  Skip `here()`, `at()`, tricks, glitches, souls.
- Compile each **practice-facing** check to its OoTR location rule.
- Compile each **practice exit** to the OR of the corresponding OoTR exits
  (e.g. Kokiri → Field becomes `can_leave_forest`).
- Map inventory + `randoSettings` into `state.ts`.
- Tests (must stay green with the existing suite, plus new ones):

  | Case | Expected |
  | --- | --- |
  | Deku Theater Skull Mask, child, no mask | out of logic |
  | Deku Theater Skull Mask, child, Skull Mask | in logic |
  | Song from Windmill, adult + ocarina, no SoS | in logic |
  | Song from Windmill, child + ocarina | out of logic |
  | Closed Forest, child, no Gohma event, go to Field | out of logic |
  | Open Forest, child, go to Field | in logic |
  | Forest Temple First Room, adult in Forest, no hookshot | in logic (lobby) |
  | KF Kokiri Sword Chest as adult | out of logic |

Practice UI unchanged. `hideLocked` can use the new oracle when enabled.

### Phase 2 — dungeon interiors without extra buttons

Goal: Forest / Fire / Water / Shadow / Spirit / Well / GTG / Ganon stop
sharing one requirement.

- Load dungeon World JSON.
- When the operator is in `oot-forest`, checks still list as Forest Temple
  checks, but each check evaluates from its logic region (lobby vs bow region
  vs basement).
- Intra-dungeon reachability: BFS of logic regions whose practice parent is
  the current dungeon, starting from the dungeon entrance region, current age
  + inventory + keys.
- Small keys: count `Small_Key_Forest_Temple` from collected items (imported
  spoilers already name them; shuffled runs need those items in the pool).
- Boss keys similarly.

Still one **Go to Forest Temple** button from SFM.

### Phase 3 — events, dual age, time travel

Goal: match play-time reachability the way SoH’s tracker does, without
becoming a tracker.

- `ReachabilitySearch`-style loop: process regions until events stop firing.
- Collecting Gohma sets `'Defeat Queen Gohma'` → `can_leave_forest`.
- Door of Time / starting age from settings (`can_open_door_of_time`).
- Optional: while standing in a region, also allow a check if the **other**
  age could do it *after swapping at ToT with current items* — **off by
  default**. Default stays “this age, this room.” A config flag can enable
  “fill-style either age” later if operators want it.

Day/night skulls: trainer has no clock. Treat GS as reachable if the item
rule holds ignoring `at_night`, or add a cheap “I waited until night” action.
Do not silently mark night-only GS in logic for child locked in Kokiri
without SoS / forest escape.

### Phase 4 — settings coverage (only what import already stores)

From imported OoTR JSON, wire into helpers:

- Closed Forest / Open Deku / Zora King / Door of Time / starting age
  (already partially mapped in `importRando.ts`)
- Rainbow bridge / Ganon BK / LACS conditions
- Gerudo Fortress (normal / fast / open)
- Shops / scrubs / tokens / trade shuffle (already affect which checks exist)

Tricks (`logic_forest_vines`, etc.): default **off**. If a spoiler includes
enabled tricks, honor them. Do not enable glitched logic.

MQ and entrance shuffle are explicit later work. Entrance shuffle would
rewrite the practice graph; do not fake it with vanilla adjacencies.

## What we will not do

- Port `fill.cpp` item placement or sphere playthrough generation into the
  trainer. Beatable shuffled seeds are a separate project; imported spoilers
  already have legal placement.
- Restyle Go/Check buttons by in-logic vs out-of-logic except `hideLocked`.
- Reintroduce MM regions, MM presets, or cross-game links.
- Claim the trainer **is** OoTR. After phase 2 we can say “vanilla glitchless
  rules from OoTR World JSON (subset).” Until then, keep the approximation
  disclaimer.
- Vendor the entire SoH tree or run Python `Search.py` in the browser.

## File-level landing spots

| Change | Where |
| --- | --- |
| Rule eval + state | new `src/logic/` |
| Practice travel/collect still call session | `src/lib/session.ts` |
| Oracle used by session | `src/data/world.ts` wraps `src/logic` |
| Settings → logic context | `src/lib/importRando.ts` + `src/logic/state.ts` |
| Drop heuristic generator | replace `scripts/generate-world.py` |
| Tests | `src/logic/*.test.ts` plus updates to `world.test.ts` / `session.test.ts` |
| Agent notes | this file + `AGENTS.md` |

## First implementation slice (when coding starts)

Do phase 0 + phase 1 only:

1. Vendor OoTR `LogicHelpers.json` and `data/World/Overworld.json` (vanilla).
2. Parser + helper expansion + `State.has`.
3. Wire `checkInLogic` / forest-escape travel to compiled rules for the
   overworld checks we already list.
4. Add the table of tests above.
5. Leave dungeon interiors as “one region” until phase 2 — but stop applying
   blanket `needs: ["hookshot"]` on every Forest check; use the per-location
   rule even if intra-dungeon BFS is not done yet (lobby chest becomes
   legal without hookshot; bow chest still needs the bow rule).

That slice already fixes the most embarrassing cases (masks, windmill SoS,
closed forest, Ganon Light Arrows as a door key) without turning Practice
into a tracker.
