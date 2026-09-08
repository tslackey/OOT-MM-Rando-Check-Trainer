# Agent notes — OoT Check Trainer

Read this before changing the app or telling the operator how to practice.

## What this project is

A **practice tool for Ocarina of Time randomizer** so the operator can get better at playing **without a check tracker**.

It is **not** the combined OoT+MM randomizer. Majora's Mask belongs in a **separate app later**. Do not reintroduce MM regions, MM presets, or cross-game travel.

Operator-facing product today:

- Web app (Vite + React + TypeScript)
- Capacitor web target (`webDir: dist`)
- GitHub Pages at https://tslackey.github.io/OOT-MM-Rando-Check-Trainer/

Practice loop: configure or import a seed, tap **Go to …** / **Check …** like walking the world, take time penalties for invalid actions, and review graphs of attempts.

## What it is not

- Not a remaining-check tracker. Do not color or hide checks to reveal in-logic vs out-of-logic unless the operator turned on an **easier** option.
- Not a claim of official OoTR. Practice buttons use a **practice graph**; penalties use an OoTR vanilla-rule **oracle** (`src/logic/`, vendored World JSON). See `docs/LOGIC_PLAN.md`.
- Not Majora's Mask and not OoTMM combo.

## Architecture

| Area | Where |
| --- | --- |
| Views (no URL router) | `src/views/` — Home, Configs, ConfigEditor, Practice, Stats |
| App state + autosave | `src/state/store.ts` → `src/storage/persist.ts` (localStorage + Capacitor Preferences) |
| World graph + checks | `src/data/world.json` + `src/data/world.ts` (practice graph) |
| Logic oracle | `src/logic/` + vendored `src/data/ootr/` (OoTR vanilla rules) |
| Built-in presets | `src/data/presets.ts` (OoT only) |
| Practice rules | `src/lib/session.ts` (travel, collect, peek, pause, age swap, respawn, Farore's Wind) |
| Spoiler generate/import | `src/lib/spoiler.ts`, `src/lib/spawns.ts`, `src/lib/importRando.ts` |
| Scoring / graphs | `src/lib/scoring.ts`, `src/components/Chart.tsx` |
| OoTR JSON import/export | `src/lib/importRando.ts` |
| Types | `src/data/types.ts` |

View state lives in the persisted store (`view`, `editingConfigId`). There is no React Router; that keeps Capacitor `file://` and GitHub Pages subpaths simple.

### Practice model

1. A `RandoConfig` chooses enabled check types, open-world flags, penalties, spawn shuffle, and optional imported settings/placement/spawns.
2. `createSession` **generates a spoiler** (item placement + child/adult spawn) from the config, or overlays imported spoiler locations and spawn entrances.
3. The operator is in one region. Buttons are adjacent **Go to** exits and **Check** locations in that region. All those buttons look the same on purpose.
4. Invalid travel / already-collected / out-of-logic check → penalty seconds. **Peek remaining** is the tracker cheat and costs more.
5. **Respawn** is the save/death warp to the current age spawn. **Farore's Wind** sets a dungeon warp point. Song warps stay on the Warp tab.
6. Every action writes through `setState` (debounced) plus pause/`pagehide` flush.

### Import format

OoTR spoiler or settings JSON (Ackbar-style):

- `settings` — kept verbatim as generation defaults; also mapped onto trainer flags (Closed Forest, Door of Time, starting age, shuffle shops/scrubs/tokens/trade, start-with items)
- `locations` — matched onto bundled OoT checks when possible; unmatched locations are counted, not invented
- `entrances` / `entrancesMap` — `Child Spawn` and `Adult Spawn` become save-warp regions (overworld spawn shuffle)
- Export writes `settings`, `locations` when known, spawn entrances, plus a `trainer` block so round-trip keeps penalties, placement, and spawns

Fixture: `src/lib/fixtures/ootr-spoiler-sample.json`.

## Invariants

1. **OoT only.** `createConfig` forces `{ oot: true, mm: false }`. Do not add MM UI, MM presets, or combo travel.
2. **No tracker tells.** Practice check/travel buttons stay visually identical. `hideCompleted` / `hideLocked` are explicit easier-mode settings, off by default.
3. **Peek is expensive.** Showing remaining checks must add `peekPenaltySeconds`.
4. **Autosave everything** that the operator would lose if they closed the tab: configs, default preset, active run, history.
5. **Pages deploy.** `.github/workflows/pages.yml` tests, builds `dist/`, and deploys to GitHub Pages. `.gitlab-ci.yml` does the same for GitLab Pages. Vite `base` is `./`. The HTML template is stamped at the top with the GitLab Pages build number (`CI_PIPELINE_IID`, or the GitHub run number when that is the pipeline).
6. **Logic stays a subset.** `world.json` is the coarse Go to / Check map. In-logic penalties come from vendored OoTR World JSON + helpers (`src/logic`), including intra-dungeon BFS and stacked keys. Do not claim the trainer **is** OoTR. Remaining gaps are in `docs/LOGIC_PLAN.md` (dual-age fill, MQ, entrance shuffle).

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

CI is the Pages workflow on `main` (test + lint, then build, then deploy).

## Plan / later

- Keep this repo OoT-focused.
- MM trainer: new app, same Capacitor/Pages pattern, not a second game toggle here.
- Native shells (`npx cap add android|ios`) only when asked.
- **Logic:** Practice travel/check penalties use the OoTR vanilla oracle in `src/logic/` (phase 0–1 of `docs/LOGIC_PLAN.md`). `world.json` is still the coarse practice map, not the full solver. Do not claim official OoTR. Dual-age fill, MQ, and entrance shuffle are later phases.
- Optional later: MQ, entrance shuffle, junk sanity types, tighter aliases.

## Tests that must stay green

- `src/lib/importRando.test.ts` — settings mapping, location match, spawn entrances, export round-trip
- `src/lib/spoiler.test.ts` — generated spoiler, shuffled spawns not always Kokiri
- `src/lib/session.test.ts` — illegal travel penalty, legal adjacent travel, double-check penalty, respawn, Farore's Wind
- `src/data/world.test.ts` — OoT spawn, no cross-game flag
- `src/logic/oracle.test.ts` — masks, windmill SoS, closed forest, Forest lobby, KF sword
- `src/lib/scoring.test.ts`, `src/lib/shuffle.test.ts`
