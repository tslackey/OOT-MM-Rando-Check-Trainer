# Task board — which agent owns what

This is the claim list for leftover **logic-oracle** and later-product work.
`docs/LOGIC_PLAN.md` is the architecture. This file is the **who is doing which slice**.

Read `AGENTS.md` and `docs/LOGIC_PLAN.md` before claiming. Practice is **OoT only**,
not a remaining-check tracker, and not a claim of official OoTR.

## How to claim

1. Pick one **open** leaf (`L-A1`, not the parent `L-A`, unless you are taking the whole parent).
2. In the same change that starts the work, set that row to **claimed** and fill
   owner / agent / branch / PR. Leave a one-line note in **Notes**.
3. One agent per leaf. Do not “help” a claimed leaf unless the owner’s PR is
   merged or the owner marked it **open** again.
4. When the PR merges, set the row to **done** and drop the agent URL.
5. If you are blocked, set **blocked** and say what you are waiting on.

Status values: `open` · `claimed` · `blocked` · `done`

| Column | Meaning |
| --- | --- |
| **Owner** | Human (`@github`) or `cloud agent` |
| **Agent** | Cursor run URL, or `—` |
| **Branch / PR** | Working branch and PR number once opened |

This run (writing the board, then starting the wrap):
[cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598)
(`bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598`).

## Do not pick up

- Port `Unittest.py` / fill into the browser.
- Vendor SoH C++, EmoTracker Lua, or run Python `Search.py` in the client.
- Fetch World JSON from GitHub at runtime on Pages.
- Restyle Go / Check by in-logic vs out-of-logic unless `hideLocked` /
  `hideCompleted` is on.
- Reintroduce Majora’s Mask, OoTMM combo, or cross-game overworld links.
- Grow `src/logic/eval.ts` with more helper stubs while **L-A** is claimed.
  Fix a practice bug with a World JSON case in `ootrPort.test.ts` if you must.

## Landed (do not re-implement)

| Id | What | PR |
| --- | --- | --- |
| L-0 | Heuristic-oracle plan | [#6](https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/6) |
| L-1 | Restricted TypeScript oracle (phase 1) | [#7](https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/7) |
| L-2 | Dungeon interiors, keys, local `at()` (phase 2) | [#8](https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/8) |
| L-3 | Events, Door of Time, optional `eitherAgeLogic` (phase 3) | [#9](https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/9) |
| L-4 | Port World JSON / LogicHelpers / `State.py` tests; stop stubbing compile / bottles / hearts / trials | [#10](https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/10) |

`src/logic/` is still a **subset**. `world.json` is still the coarse Go / Check map.

## Active

| Id | Slice | Status | Owner | Agent | Branch / PR | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| L-DOC | This board + `AGENTS.md` pointer | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | `cursor/logic-task-board-7598` [#11](https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/11) | Land first so other agents can claim |
| L-A | Wrap `@mracsys/randomizer-graph-tool` as the penalty backend | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | `cursor/tracker-graph-wrap-7598` | Parent of A1–A5. Same agent. Do not start a second wrap. Package pinned at 2.1.18. |
| L-A1 | Pin the npm package; build a **local** `ExternalFileCache` (no GitHub fetch on Pages) | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | same as L-A | `src/data/ootr/` is **not** enough. Graph-tool wants SettingsList / ItemList / LocationList / EntranceShuffle / presets / MQ + Glitched World for a named Release (e.g. `8.3.0 Release`). Vendor that set separately. `local_files` is Node-only; the browser needs an inlined `{ files, subfolder }` cache. |
| L-A2 | Build the graph once per session / settings change; mutate inventory and checked locations on collect | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | same as L-A | First compile is slow (5–10s). Search must stay &lt;1ms. |
| L-A3 | `checkLocationInLogic` / `connectionInLogic` = visited **as this age** inside **this practice node** | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | same as L-A | Stricter than fill-style both-ages-from-Root. Keep `eitherAgeLogic` as the only opt-in. |
| L-A4 | Keep `ootrPort.test.ts` + `oracle.test.ts` + session tests green while swapping the backend | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | same as L-A | Restricted evaluator stays until the wrap is the oracle. |
| L-A5 | Accept Babel bundle weight or lazy-load the graph on first Practice start | claimed | cloud agent | [bc-01a082f5…](https://cursor.com/agents/bc-01a082f5-fb67-7db6-9d83-6d31bb1c7598) | same as L-A | Pages `base` stays `./`. |

Until L-A merges, the restricted evaluator in `src/logic/` remains the penalty oracle.

## Open (claim here)

Do these **after** L-A, unless a row says it is independent.

| Id | Slice | Status | Owner | Agent | Branch / PR | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| L-B | Keep compile-every-rule green for as long as we still own the parser | open | — | — | — | Subsumed by L-A4 once the wrap replaces compile. Independent only if L-A is abandoned. |
| L-C | Honor settings the importer already stores | open | — | — | — | Parent. Claim children. |
| L-C1 | Rainbow bridge / Ganon boss key / LACS counts from imported `settings` | open | — | — | — | Partially wired. After or with L-A. |
| L-C2 | Gerudo Fortress: normal / fast / open | open | — | — | — | |
| L-C3 | Tricks: default off; honor `logic_*` from a spoiler. No glitched logic. | open | — | — | — | |
| L-INV | Trainer inventory rarely carries `Piece_of_Heart` or bottled contents; heart-bridge imports look locked | open | — | — | — | Independent of wrap. |
| L-KEY | Remaining `(Small_Key_*, n)` mappings that still lock a dungeon | open | — | — | — | Forest/Fire/Water/Shadow/Spirit/Well/GTG/Ganon/hideout already map. Fix only with a failing World JSON case. |
| L-SHOP | `Buy_Deku_Shield` etc. are not granted just because a chest gave `Deku_Shield` | open | — | — | — | `has_shield` already accepts owned `Deku_Shield`. Shop-sanity only. |
| L-MQ | Master Quest interiors | open | — | — | — | Needs MQ World JSON + practice mapping. Not a helper stub. |
| L-ENT | Entrance shuffle | open | — | — | — | Would rewrite the practice graph. Do not fake it with vanilla adjacencies. |
| P-MM | Majora’s Mask trainer | open | — | — | — | **New app**, same Capacitor/Pages pattern. Not a second game toggle here. |
| P-NAT | Capacitor Android / iOS shells | open | — | — | — | Only when a human asks. `npx cap add android\|ios`. |
| P-JUNK | Tighter junk-sanity types / location aliases | open | — | — | — | Optional. |

## Hard limits (every claim)

- **OoT only** in this repo. `createConfig` stays `{ oot: true, mm: false }`.
- **No tracker HUD.** Do not import TOoTR’s React map. Do not paint availability
  on Go / Check.
- **Peek stays expensive** (`peekPenaltySeconds`).
- Vite `base` is `./`. Deploy `dist/` via `.github/workflows/pages.yml`.
- Tests that must stay green: `importRando`, `spoiler`, `session`, `world`,
  `oracle`, `ootrPort`, `scoring`, `shuffle` (and dungeon tests if present).
  Run `npm test` and `npm run lint`.

## Suggested next claim after L-A

1. **L-C1** or **L-C2** — imported settings the operator already pasted.
2. **L-INV** — if heart / bottle bridges show as locked on real spoilers.
3. **L-MQ** / **L-ENT** — only with a human asking for those modes.
