# Plan: make the practice oracle match vendored OoTR rules

Practice “in logic” penalties should answer the same question OoT-Randomizer
asks of a rule string: **with this age, these items, these settings, and the
operator standing in this practice region, does this location or exit hold?**

This is **not** a fill-time solver and **not** a claim of official OoTR.

**Status:** Phase 0–3 is in the app. `src/logic/` evaluates vendored OoTR vanilla World JSON as the practice penalty oracle, including intra-dungeon BFS, `at()` gated on reachable subregions, stacked keys, visit-time events, and Door of Time / starting-age time travel. `world.json` remains the coarse Go to / Check map (OoT only). Compile coverage and `State.py` methods live in `src/logic/ootrPort.test.ts`. Later work: wrap a tracker search (`randomizer-graph-tool`), imported trick settings, MQ, entrance shuffle. Claim slices in `docs/TASKS.md`. Fill-style either-age checks are an optional config flag, off by default.

## Status

`src/logic/` evaluates vendored OoTR vanilla World JSON + `LogicHelpers.json`.
`world.json` is still the coarse Go to / Check map (OoT only).

What is actually true today:

- Phase 0–3 shipped a restricted TypeScript parser/evaluator plus intra-dungeon
  BFS, stacked keys, visit-time events, and Door of Time time travel. It is
  still a **subset**, not official OoTR.
- Hand-picked `oracle.test.ts` cases are not enough by themselves. Vendored
  World JSON + LogicHelpers + `State.py` methods are compiled and evaluated in
  `src/logic/ootrPort.test.ts`. OoTR’s own `tests/` folder is fill/plando
  generation — do not port that into the browser.
- The next architectural step is wrapping a tracker search, not adding another
  helper stub. MQ and entrance shuffle stay later.

## Yes — logic trackers already implement this

The thing we keep rewriting in `src/logic/` is **check reachability**: given
settings + inventory (+ age), which locations and exits are legal. That is
exactly what a **map / logic tracker** computes every time you mark an item.

It is **not** what an item-only tracker computes. Xopar, Gossip Stones, and
most race-legal item grids only store “I have Hookshot.” They do not run
OoTR search.

From the [OoTR tracker list](https://wiki.ootrandomizer.com/index.php/Trackers):

| Tracker | What it actually runs |
| --- | --- |
| **TOoTR** ([mracsys/tootr](https://github.com/mracsys/tootr), MIT, Vite) | [@mracsys/randomizer-graph-tool](https://github.com/mracsys/randomizer-graph-tool) — TypeScript port of OoTR World JSON + `Search`. `collect_locations()` then `get_visited_locations()`. |
| **Track-OoT** | Map tracker: green / yellow / red by “can I get checks here with current items.” |
| **Hashfrog** | Web tracker “based on the randomizer generator logic.” |
| **Hamsda / coavins EmoTracker** | Lua recreation of availability (green / orange / peek / trick). Desktop, not a library. |
| **HoodTracker** | “Uses the Randomizer logic directly” (embeds upstream search). |
| **SoH in-game tracker** | Same C++ `ReachabilitySearch` as fill. |
| **OoTR `Search.py`** | The generator’s own dual-age BFS. Python. This is what the others are cloning. |

So the missing piece is not another hand-rolled AST. It is **wrapping a
tracker search as a silent oracle**.

### Steal the engine, not the HUD

Trackers exist to **show** availability. This app exists to **penalize**
wrong taps without showing the answer. Racing even bans “logic trackers”
that reveal accessibility. Practice buttons stay identical unless the
operator turned on `hideLocked`.

`collect_locations()` from Root (both ages, current items) answers “is this
check in the sphere-0 playthrough?” That is what TOoTR paints green. A
practice tap is “can I do this **here, now, as this age**.” Same graph,
stricter question. The wrap is:

1. Build / mutate the tracker graph from config + inventory + events.
2. Ask: is location L visited **as the current age**, and is its parent
   region inside the current practice node?
3. Ask: is there an accessible entrance from this practice node to B?
4. Never color the button from that result except `hideLocked`.

### Why we should stop growing `src/logic/` as a second RuleParser

`randomizer-graph-tool` already:

- Parses OoTR rule strings with Babel (real `here()` / `at()` / helpers)
- Runs dual-age region expansion
- Pins multiple upstream versions (8.1 / 8.2 / Fenhl / Rob)
- Ships Jest tests against cached OoTR files
- Is MIT and npm-installable (`@mracsys/randomizer-graph-tool`)

Costs if we take it:

- First graph compile is **5–10 seconds**; a search is **&lt;1 ms**. Cache the
  graph on the session, mutate items, do not rebuild on every tap.
- Needs a **local file cache** of World JSON for the pinned version (GitHub
  Pages must not fetch `github.com` at runtime). We already vendor vanilla
  JSON; point the cache at `src/data/ootr/`.
- Default search is fill-style (both ages from spawn). Keep the
  here-and-now filter in `oracle.ts` so Practice does not become Track-OoT.
- Bundle weight (Babel standalone). Accept it or lazy-load the graph on
  first Practice start.

EmoTracker Lua packs and SoH C++ are the same algorithm in the wrong
language. Do not vendor those.

## Why a handful of fixtures was the wrong plan

OoTR does not unit-test individual location rules. It vendors the rules, then
proves seeds with `Search.py` + plando generation (`Unittest.py`). Copying
those generation tests would mean running Python fill in CI.

What we can port to web code — and already have started porting — is the
**other** source of truth:

| Upstream | What to assert in Vite |
| --- | --- |
| `data/LogicHelpers.json` | Every helper compiles. `can_use`, `can_play`, `can_leave_forest`, `can_open_door_of_time`, `can_build_rainbow_bridge` eval like OoTR. |
| `State.py` | `has_bottle`, `has_hearts`, `can_live_dmg`, `has_soul` (vanilla: always true), `has_all_notes_for_song`. |
| vanilla `data/World/*.json` | Every location / exit / event compiles. Known spots (masks, windmill, KF sword, Deku slingshot `here(has_shield)`, Forest `at(Falling Room)`, Drain Well, rainbow bridge) eval from the practice region. |
| `RuleParser.py` `at()` / `here()` | `here(rule)` is the current logic region. `at(region, rule)` is true only if that logic region is reachable **inside the same practice node**, or the target is a different practice node (entrance age gates). |

Do **not** invent more keyword `needs[]` fixtures. If a case matters, quote the
OoTR location/helper name and evaluate it.

## What is still wrong

These are the remaining lies, in the order they bite practice:

1. **`at()` is local, not world-search.** Cross-region `at('Bottom of the Well', is_child)`
   on Farore’s Wind / age-switch exits is treated as the inner rule only. That
   matches entrance age gates. It does **not** match fill-time “has this region
   been reached as this age.”
2. **Drain Well is child + Song of Storms.** Vanilla story has adult drain the
   well from the windmill. OoTR’s event is `'Drain Well': is_child and can_play(Song_of_Storms)`.
   Do not “fix” that toward the story. Adult SoS can persist the event via
   visit-time / other-age event firing when the Door of Time is open.
3. **Small keys / boss keys** stack from the trainer inventory (`small_key_forest`
   × N). That landed in phase 2. Missing mappings still lock `(Small_Key_*, n)`.
4. **`here()` does not re-search the current region.** It evaluates the inner
   rule in the current state. That matches OoTR for “you are already here.”
5. **Day/night:** `at_night` is treated as “waited.” `gold_skulls_ignore_daytime`
   is false, so a forest-locked child cannot collect KF night GS without SoS /
   forest escape / night start.
6. **Hearts / bottles** now follow `State.py`, but the trainer inventory rarely
   carries `Piece_of_Heart` or bottled contents. Heart-bridge imports will look
   locked until those counts exist.
7. **Ganon trials default to skipped** in `emptySettings` so tower access is
   not a hidden lock. Vanilla OoTR leaves `skipped_trials[*] = false`. Tests
   that care must set the dict.
8. **Shop buy items** (`Buy_Deku_Shield`, …) are not given just because the
   operator collected a shield from a chest. Owning `Deku_Shield` still
   satisfies `has_shield` via `state.has` before helper expansion.
9. **Either-age** is an optional `eitherAgeLogic` flag (off by default). Default
   stays this age, this room. Collecting Gohma still sets `'Defeat Queen Gohma'`.
10. **MQ, entrance shuffle, tricks, glitches** stay off unless an imported
    spoiler enables a `logic_*` flag.

`world.json` connections still carry leftover heuristic `needs[]`. The oracle
ignores those when both ends map to logic regions and uses OoTR exits instead.

## Two graphs (do not collapse them)

Randomizers search hundreds of subregions. The trainer UI must stay walkable:
**Go to Lost Woods**, not **Go to LW Beyond Mido**.

1. **Practice graph** — coarse regions, same shape as today’s `world.json`.
2. **Logic graph** — OoTR regions, exits, locations, events, helpers. Used only
   to answer “is this travel / check in logic given inventory, settings, and
   current age?”

Map every logic region and every location to exactly one practice region
(`Forest Temple Lobby` → `oot-forest`, `Deku Theater` → `oot-deku-theater`).

Practice buttons stay visually identical. `hideLocked` / `hideCompleted` remain
the only easier-mode tells. Peek still costs `peekPenaltySeconds`.

## What “in logic” means during a run

Fill-time search explores **both ages** from Root. A practice run does not:
the operator is in **one** practice region as **one** age.

| Action | Stay here | In logic if |
| --- | --- | --- |
| **Go to B** | B is an adjacent practice exit | Current age + inventory satisfy at least one logic exit from a reachable logic region inside the current practice node that lands in B. |
| **Check L** | L’s practice region is the current region | Current age + inventory satisfy L’s access rule **and** L’s logic region is reachable without leaving this practice node. |
| **Warp** | Song owned + ocarina | `can_play(song)`, plus `can_leave_forest` where OoTR requires it. |
| **Age swap** | Temple of Time | `can_open_door_of_time`. |

Out-of-logic still only adds penalty seconds. It does not restyle the button.

## Next slices (do these, in order)

**Claim a leaf in `docs/TASKS.md` before starting.** That file is the
who-owns-what board (`L-A` is the wrap; `L-C*` is imported settings).
Do not start a second wrap while `L-A` is claimed.

### Slice A — wrap a tracker search (the real next step)

Preferred: `@mracsys/randomizer-graph-tool` (what TOoTR uses).

- Pin one supported Release (graph-tool 2.1.18 understands e.g. `8.3.0 Release`).
  `src/data/ootr/` is only vanilla World JSON + helpers. The cache also needs
  `SettingsList.py`, `ItemList.py`, `LocationList.py`, MQ, and Glitched World.
  Inline `{ files, subfolder }` for the browser — `local_files` is Node-only.
  Do not fetch GitHub at runtime on Pages.
- Build the graph once per session (or when settings change). Mutate
  inventory / checked locations on collect.
- `checkLocationInLogic` / `connectionInLogic` become “is this visited as
  this age inside this practice node,” not a second rule interpreter.
- Keep `ootrPort.test.ts` as a regression gate while swapping the backend.
- Do not import TOoTR’s React map or paint availability.

Until that lands, the restricted `src/logic/` evaluator stays as the
penalty oracle. Do not add more helper stubs unless a practice bug needs
them.

### Slice B — keep the ported suite green

- Every helper and World JSON rule compiles (`HELPER_COMPILE_ERRORS`,
  `WORLD_COMPILE_ERRORS` must stay empty) for as long as we own the parser.
- Add a new World JSON case when fixing a bug; do not add a parallel heuristic.

### Slice C — settings the importer already stores

- Rainbow bridge / Ganon BK / LACS counts (partially wired).
- Gerudo Fortress (normal / fast / open).
- Tricks: default off; honor `logic_*` from a spoiler.
- MQ and entrance shuffle stay later. Entrance shuffle would rewrite the
  practice graph; do not fake it with vanilla adjacencies.

Keys, visit-time events, Door of Time, and optional `eitherAgeLogic` already
landed on `main` (phases 2–3). Do not re-implement them.

## Phases (landed on main)

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

**Landed.** Forest / Fire / Water / Shadow / Spirit / Well / GTG / Ganon checks no longer share one requirement.

- Dungeon World JSON is loaded. When the operator is in `oot-forest`, checks still list as Forest Temple checks, but each check evaluates from its logic region (lobby vs bow region vs basement) via BFS from the dungeon entrance.
- `at(region, rule)` is true only when that logic region is already in the current dungeon’s reachable set. Cross-practice `at()` (Saria’s song looking at HC Garden) still uses the inner rule.
- Small keys and boss keys stack (`small_key_forest` × N → `Small_Key_Forest_Temple`). Shuffled runs put vanilla key counts in the item pool; imported spoilers map `Small Key (Forest Temple)` etc.
- Forest Temple Map is `Forest Temple Map Chest` (Song of Time from the lobby as adult), not the First Room Chest. First Room stays available via `locationNamedInLogic` for tests.
- Fire Temple Hammer maps to `Fire Temple Megaton Hammer Chest`, not a crate.

Still one **Go to Forest Temple** button from SFM.

### Phase 3 — events, dual age, time travel

**Landed.** Play-time reachability fires events until they stop, without turning Practice into a tracker.

- Intra-practice BFS still loops until events/exits stabilize, and also processes Root events plus `Time_Travel` when `can_open_door_of_time` (or adult start) is true. If the door is open, the other age’s events in the **same** practice region can fire (shared inventory) so windmill SoS / similar persist.
- Collecting Gohma sets `'Defeat Queen Gohma'` → `can_leave_forest` for a closed-forest child. Uncollected `"Defeat …"` events from merely reaching a boss room are **not** persisted.
- Visiting a region persists its events onto the run (`logicEvents`), so adult Dampe race (`Dampes Windmill Access`) still counts after walking back to Kakariko.
- Door of Time / starting age use `can_open_door_of_time`. Adult start can always swap at ToT; child needs Open DoT or ocarina + Song of Time.
- Optional config `eitherAgeLogic` (off by default): a check in this room is in logic if the other age could do it here after opening the Door of Time. Buttons stay visually identical. Go-to travel stays this age.
- Day/night: `at_night` is treated as “waited.” `gold_skulls_ignore_daytime` is **false**, so a forest-locked child cannot collect KF night GS without SoS / forest escape / night start.

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

- Port `fill.cpp` / `Unittest.py` seed generation into the trainer.
- Restyle Go/Check by in-logic vs out-of-logic except `hideLocked`.
- Reintroduce MM regions, MM presets, or cross-game links.
- Claim the trainer **is** OoTR. After phase 3 we can say “vanilla glitchless
  rules from OoTR World JSON (subset).” Keep the approximation
  disclaimer for MQ, entrance shuffle, and tricks.
- Vendor the SoH tree, EmoTracker Lua, or run Python `Search.py` in the browser.
- Turn Practice into TOoTR / Track-OoT (no availability colors, no remaining-check map).
- Fetch randomizer files from GitHub at runtime on Pages.
- Treat adult-windmill-drain or “whole Forest needs hookshot” as logic. Those
  are story / old heuristic, not OoTR.

## File-level landing spots

| Change | Where |
| --- | --- |
| Parse + compile errors | `src/logic/rules.ts`, `src/logic/compile.ts` |
| Helper / State eval | `src/logic/eval.ts`, `src/logic/state.ts` |
| Local `at()` reachability | `src/logic/search.ts` |
| Practice travel/collect | `src/lib/session.ts` (shape unchanged) |
| Oracle wrappers | `src/data/world.ts` → `src/logic/oracle.ts` |
| Tracker search wrap (next) | new adapter in `src/logic/` around `@mracsys/randomizer-graph-tool` |
| Ported tests | `src/logic/ootrPort.test.ts` |
| Smoke cases | `src/logic/oracle.test.ts` |
| Who owns which slice | `docs/TASKS.md` |
| Agent notes | this file + `AGENTS.md` |

## Study list

- [TOoTR](https://github.com/mracsys/tootr) +
  [@mracsys/randomizer-graph-tool](https://github.com/mracsys/randomizer-graph-tool)
  — MIT TypeScript. This is the engine to wrap.
- [OoT-Randomizer](https://github.com/OoTRandomizer/OoT-Randomizer) — MIT.
  `Search.py` is what the graph tool is a port of. World JSON stays vendored.
- [Trackers wiki](https://wiki.ootrandomizer.com/index.php/Trackers) — which
  apps implement logic vs item grids.
- Ship of Harkinian’s 3drando port — same graph, C++. Do not vendor it.
- Archipelago OoT / EmoTracker Lua — derived. Not a better source than TOoTR.
