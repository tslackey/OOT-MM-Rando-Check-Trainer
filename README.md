# OoT Check Trainer

Practice Ocarina of Time randomizer routing without a check tracker. The app is a Capacitor web project you can run in a browser, wrap later as a native shell, and publish with GitHub Pages.

Majora's Mask will be a separate trainer later. This app is OoT only.

## What it does

- Save named OoT rando configurations (check types, open-world flags, penalty times).
- Import an OoTR spoiler/settings JSON and keep those settings as generation defaults.
- Practice generates a spoiler from the config (item placement plus child/adult spawn). Imported spoilers keep their locations and shuffled overworld spawns.
- Respawn (save/death warp) and Farore's Wind are available on the Warp tab.
- Mark one preset as your default; new configs copy its training penalties.
- Practice by tapping **Go to** / **Check** buttons, the same way you would walk a seed.
- Invalid travels, already-collected checks, and out-of-logic actions add time penalties.
- **Peek remaining** is the tracker crutch: it shows leftover checks and costs a larger penalty.
- Graphs plot adjusted time, penalties, pace, and completion across attempts.
- Runs, configs, and stats autosave to `localStorage` and Capacitor Preferences so you can pick the app up and put it down.

The bundled location list is the vanilla always-shuffled OoT check set (no MQ, no junk grass/pots). **Go to** / **Check** buttons follow a coarse practice map. Whether a tap is in logic uses vendored OoT-Randomizer vanilla rules (helpers + World JSON) as a penalty oracle — not a full fill-time solver, and not a claim of official OoTR. Remaining work is in `docs/LOGIC_PLAN.md`.

## Import a rando JSON

On **Configs**, use **Import JSON** with an OoTR spoiler or settings file like:

```json
{
  "version": "Ackbar Delta (9.2.3)",
  "fileType": 3,
  "seed": "6951318300",
  "settings": {
    "Closed Forest": "On",
    "Door of Time": "Open",
    "Starting Age": "Random"
  }
}
```

The importer stores the original `settings` object so you can **Export JSON** and reuse it as generation defaults. If the file also has `locations`, matched checks keep that seed's item placement. **Child Spawn** / **Adult Spawn** in `entrances` or `entrancesMap` become the child and adult save-warp points (so shuffled overworld spawns do not start you in Kokiri unless that is the spawn). **Set as default** makes that preset the Home start button and the template for new configs.

During a run, **Warp** always includes **Respawn** to the current age's save warp. If you have Farore's Wind, you can set a dungeon point and warp back. **Spoiler** downloads the generated/imported log for that attempt.

## Scripts

```bash
npm install
npm run dev          # Vite web target
npm test
npm run build        # typecheck + static build to dist/
npx cap sync         # copy web build into native projects once you add them
```

## GitHub Pages / GitLab Pages

`.github/workflows/pages.yml` tests, builds, and publishes `dist/` on pushes to `main`. `.gitlab-ci.yml` publishes the same `dist/` as GitLab Pages. The Vite `base` is `./`, so it works as a project site at `/OOT-MM-Rando-Check-Trainer/`.

The HTML template is stamped at the top with the current GitLab Pages build number (`CI_PIPELINE_IID`). GitHub Actions fills the same stamp from the workflow run number.

https://tslackey.github.io/OOT-MM-Rando-Check-Trainer/

## Capacitor

`capacitor.config.ts` points `webDir` at `dist`. Web is the first target; add native platforms when you want them:

```bash
npm run build
npx cap add android
npx cap add ios
npx cap sync
```
