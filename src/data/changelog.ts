export interface ChangelogEntry {
  /** Calendar date the change landed on main (UTC). */
  date: string;
  title: string;
  summary: string;
  /** GitHub pull request that merged the change. */
  pr?: number;
  /**
   * GitHub Actions `github.run_number` (same value as the Pages build stamp)
   * for the main deploy that first shipped this change. Omit for the change
   * still in flight; the build stamps it when CI knows the PR or `pending`.
   */
  build?: string;
  /** Newest unpublished row. The current Pages build fills `build` at compile time. */
  pending?: boolean;
}

export const CHANGELOG_REPO = "tslackey/OOT-MM-Rando-Check-Trainer";

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-09",
    title: "Shuffle Open Chest is an ability, not a check type",
    summary:
      "Imported Shuffle Open Chest (Off / On / Progressive) is the progressive open-small-then-open-big item. Standard locations stay in the check list; opening them needs that ability when the setting is on.",
    pr: 16,
    pending: true,
  },
  {
    date: "2026-09-09",
    title: "Imported rainbow bridge, LACS, and Ganon boss key",
    summary:
      "A pasted spoiler’s Rainbow Bridge, Light Arrow Cutscene, and Ganon’s Boss Key settings (including counts) now drive Ganon’s door and those checks instead of always using vanilla.",
    pr: 15,
  },
  {
    date: "2026-09-08",
    title: "Changelog in the app",
    summary:
      "The Pages build stamp and a Changes tab list each shipped pull request next to the build number that published it.",
    pr: 13,
  },
  {
    date: "2026-09-08",
    title: "Claimable task board for leftover logic work",
    summary:
      "docs/TASKS.md is the who-owns-what board. Agents claim a leaf before starting so two runs do not take the same oracle slice.",
    pr: 11,
    build: "40",
  },
  {
    date: "2026-09-08",
    title: "Port OoTR World JSON tests and stop stubbing the oracle",
    summary:
      "Compile every vendored helper and World rule. Bottles, hearts, live damage, local at(), and skipped Forest trial now match State.py instead of hand-picked stubs.",
    pr: 10,
    build: "31",
  },
  {
    date: "2026-09-08",
    title: "Events, Door of Time, and optional either-age logic",
    summary:
      "Collecting Gohma opens closed forest. Visit-time events persist across rooms. Night Gold Skulltulas stay locked in Kokiri without an escape. Either-age checks stay off unless the operator turns them on.",
    pr: 9,
    build: "29",
  },
  {
    date: "2026-09-08",
    title: "Dungeon interiors, keys, and at() reachability",
    summary:
      "Forest, Fire, Water, and Shadow checks use interior BFS and stacked small/boss keys instead of one lobby rule. Starting inventory keeps duplicate keys.",
    pr: 8,
    build: "27",
  },
  {
    date: "2026-09-08",
    title: "OoTR vanilla-rule oracle for practice penalties",
    summary:
      "Go to / Check buttons still use the coarse practice map. Invalid travel and checks now follow vendored OoTR World JSON rules (masks, windmill song, closed forest, Forest lobby, rainbow bridge).",
    pr: 7,
    build: "25",
  },
  {
    date: "2026-09-08",
    title: "Plan to replace heuristic logic with OoTR reachability",
    summary: "Document why world.json AND-lists are not official logic and the phased oracle plan.",
    pr: 6,
    build: "23",
  },
  {
    date: "2026-09-08",
    title: "Kokiri to Hyrule Field walks Lost Woods Bridge",
    summary:
      "Leaving the woods maze no longer jumps straight to Hyrule Field. Practice travel is Kokiri → Lost Woods Bridge → Field.",
    pr: 5,
    build: "20",
  },
  {
    date: "2026-09-08",
    title: "Generated spoilers and shuffled overworld spawns",
    summary:
      "Each run builds item placement plus child/adult save warps from the config. Imported Child/Adult Spawn entrances are honored. Warp tab adds Respawn and Farore's Wind.",
    pr: 4,
    build: "18",
  },
  {
    date: "2026-09-08",
    title: "Drop leftover MM checks and stamp the Pages build",
    summary:
      "OoT-only runs no longer shuffle Majora items onto song checks. The HTML template shows the Pages build number at the top.",
    pr: 3,
    build: "15",
  },
  {
    date: "2026-09-08",
    title: "Up to three in-progress runs",
    summary:
      "Starting a new attempt no longer overwrites an unfinished one. Home and the empty Practice screen can resume or delete each slot. Start blocks at three.",
    pr: 2,
    build: "11",
  },
  {
    date: "2026-09-08",
    title: "Practice UI: clear checks, age filter, theater, inventory and warp",
    summary:
      "Collected checks disappear, other-age options stay hidden, and wrong taps turn red. Deku Theater is its own child-only stop. Inventory and Warp are separate tabs.",
    pr: 1,
    build: "7",
  },
  {
    date: "2026-09-08",
    title: "Cursor steering for the OoT trainer",
    summary: "AGENTS.md and the project rule document the product, architecture, and OoT-only invariants.",
    build: "4",
  },
  {
    date: "2026-09-08",
    title: "Trainer is Ocarina of Time only",
    summary: "Combined OoTMM and Majora presets are gone. MM stays a later separate app.",
    build: "3",
  },
  {
    date: "2026-09-08",
    title: "OoTR JSON import for presets",
    summary:
      "Import a spoiler or settings file onto a config, keep the original settings for export, and mark one preset as the Home default.",
    build: "2",
  },
  {
    date: "2026-09-08",
    title: "Publish on GitHub Pages",
    summary: "Vite dist/ deploys from the Pages workflow on main. GitLab CI still publishes the same folder.",
    build: "1",
  },
  {
    date: "2026-09-08",
    title: "First Capacitor web trainer",
    summary:
      "Vite + React app with saved rando configs, Go to / Check practice, penalties, graphs, and autosave.",
  },
];
