# OoTMM Check Trainer

Practice [OoTMM](https://ootmm.com/) routing without a check tracker. The app is a Capacitor web project you can run in a browser, wrap later as a native shell, and publish with GitLab Pages.

## What it does

- Save named rando configurations (games, check types, open-world flags, penalty times).
- Practice by tapping **Go to** / **Check** buttons, the same way you would walk a seed.
- Invalid travels, already-collected checks, and out-of-logic actions add time penalties.
- **Peek remaining** is the tracker crutch: it shows leftover checks and costs a larger penalty.
- Graphs plot adjusted time, penalties, pace, and completion across attempts.
- Runs, configs, and stats autosave to `localStorage` and Capacitor Preferences so you can pick the app up and put it down.

The bundled location list is the vanilla always-shuffled OoTMM check set (no MQ, no junk grass/pots). Logic is a training approximation, not the full randomizer solver.

## Scripts

```bash
npm install
npm run dev          # Vite web target
npm test
npm run build        # typecheck + static build to dist/
npx cap sync         # copy web build into native projects once you add them
```

## GitLab Pages

`.gitlab-ci.yml` builds the Vite app and publishes `dist/` as Pages on the default branch. The Vite `base` is `./`, so the site works on unique Pages domains and project subpaths.

After the first pipeline, enable Pages in the GitLab project if it is not already on.

## Capacitor

`capacitor.config.ts` points `webDir` at `dist`. Web is the first target; add native platforms when you want them:

```bash
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

## Generate check data

`src/data/world.json` is generated from the public OoTMM check table:

```bash
npm run generate:world
```
