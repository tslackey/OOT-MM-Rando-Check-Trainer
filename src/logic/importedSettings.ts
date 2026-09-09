/** Map imported OoTR / Ackbar display settings onto graph-tool / World JSON keys. */

export type ImportedLogicSettings = Record<string, string | number>;

function text(imported: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = imported[key];
    if (value != null && String(value).trim() !== "") return String(value);
  }
  return undefined;
}

function count(imported: Record<string, string>, ...keys: string[]): number | undefined {
  const raw = text(imported, ...keys);
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function bridgeCondition(value: string): string | undefined {
  const v = value.toLowerCase();
  if (v.includes("open")) return "open";
  if (v.includes("vanilla")) return "vanilla";
  if (v.includes("stone")) return "stones";
  if (v.includes("medallion")) return "medallions";
  if (v.includes("token")) return "tokens";
  if (v.includes("heart")) return "hearts";
  if (v.includes("dungeon")) return "dungeons";
  return undefined;
}

function lacsCondition(value: string): string | undefined {
  const v = value.toLowerCase();
  if (v.includes("vanilla")) return "vanilla";
  if (v.includes("stone")) return "stones";
  if (v.includes("medallion")) return "medallions";
  if (v.includes("token")) return "tokens";
  if (v.includes("heart")) return "hearts";
  if (v.includes("dungeon")) return "dungeons";
  return undefined;
}

function ganonBossKey(value: string): string | undefined {
  const v = value.toLowerCase();
  if (v.includes("lacs")) return "on_lacs";
  if (v.includes("triforce")) return "triforce";
  if (v.includes("remove") || v.includes("start with")) return "remove";
  if (v.includes("any dungeon")) return "any_dungeon";
  if (v.includes("overworld")) return "overworld";
  if (v.includes("anywhere") || v.includes("keysanity")) return "keysanity";
  if (v.includes("own dungeon") || v === "vanilla" || v === "dungeon") return "dungeon";
  if (v.includes("stone")) return "stones";
  if (v.includes("medallion")) return "medallions";
  if (v.includes("token")) return "tokens";
  if (v.includes("heart")) return "hearts";
  if (v.includes("dungeon")) return "dungeons";
  return undefined;
}

/** Defaults applied every graph query so the singleton world does not leak the last seed. */
export const VANILLA_BRIDGE_SETTINGS: ImportedLogicSettings = {
  bridge: "vanilla",
  bridge_stones: 3,
  bridge_medallions: 6,
  bridge_rewards: 9,
  bridge_tokens: 100,
  bridge_hearts: 20,
  lacs_condition: "vanilla",
  lacs_stones: 3,
  lacs_medallions: 6,
  lacs_rewards: 9,
  lacs_tokens: 100,
  lacs_hearts: 20,
  shuffle_ganon_bosskey: "dungeon",
  ganon_bosskey_stones: 3,
  ganon_bosskey_medallions: 6,
  ganon_bosskey_rewards: 9,
  ganon_bosskey_tokens: 100,
  ganon_bosskey_hearts: 20,
};

export function importedLogicSettings(imported: Record<string, string> = {}): ImportedLogicSettings {
  const out: ImportedLogicSettings = {};
  const bridge = text(imported, "Rainbow Bridge", "Bridge");
  if (bridge) {
    const mapped = bridgeCondition(bridge);
    if (mapped) out.bridge = mapped;
  }
  const lacs = text(imported, "LACS Condition", "Light Arrow Cutscene", "LACS");
  if (lacs) {
    const mapped = lacsCondition(lacs);
    if (mapped) out.lacs_condition = mapped;
  }
  const bk = text(
    imported,
    "Ganon's Boss Key",
    "Ganon Boss Key",
    "Shuffle Ganon's Boss Key",
    "Shuffle Ganon Boss Key",
  );
  if (bk) {
    const mapped = ganonBossKey(bk);
    if (mapped) out.shuffle_ganon_bosskey = mapped;
  }

  const stones = count(imported, "Bridge Stone Count", "Rainbow Bridge Stone Count");
  if (stones != null) out.bridge_stones = stones;
  const meds = count(imported, "Bridge Medallion Count", "Rainbow Bridge Medallion Count");
  if (meds != null) out.bridge_medallions = meds;
  const rewards = count(imported, "Bridge Reward Count", "Rainbow Bridge Reward Count", "Bridge Dungeon Reward Count");
  if (rewards != null) out.bridge_rewards = rewards;
  const tokens = count(imported, "Bridge Token Count", "Rainbow Bridge Token Count");
  if (tokens != null) out.bridge_tokens = tokens;
  const hearts = count(imported, "Bridge Heart Count", "Rainbow Bridge Heart Count");
  if (hearts != null) out.bridge_hearts = hearts;

  const lacsStones = count(imported, "LACS Stone Count", "Light Arrow Cutscene Stone Count");
  if (lacsStones != null) out.lacs_stones = lacsStones;
  const lacsMeds = count(imported, "LACS Medallion Count", "Light Arrow Cutscene Medallion Count");
  if (lacsMeds != null) out.lacs_medallions = lacsMeds;
  const lacsRewards = count(imported, "LACS Reward Count", "Light Arrow Cutscene Reward Count");
  if (lacsRewards != null) out.lacs_rewards = lacsRewards;
  const lacsTokens = count(imported, "LACS Token Count", "Light Arrow Cutscene Token Count");
  if (lacsTokens != null) out.lacs_tokens = lacsTokens;
  const lacsHearts = count(imported, "LACS Heart Count", "Light Arrow Cutscene Heart Count");
  if (lacsHearts != null) out.lacs_hearts = lacsHearts;

  const bkStones = count(imported, "Ganon's Boss Key Stone Count", "Ganon Boss Key Stone Count");
  if (bkStones != null) out.ganon_bosskey_stones = bkStones;
  const bkMeds = count(imported, "Ganon's Boss Key Medallion Count", "Ganon Boss Key Medallion Count");
  if (bkMeds != null) out.ganon_bosskey_medallions = bkMeds;
  const bkRewards = count(
    imported,
    "Ganon's Boss Key Reward Count",
    "Ganon Boss Key Reward Count",
    "Ganon's Boss Key Dungeon Count",
    "Ganon Boss Key Dungeon Count",
  );
  if (bkRewards != null) out.ganon_bosskey_rewards = bkRewards;
  const bkTokens = count(imported, "Ganon's Boss Key Token Count", "Ganon Boss Key Token Count");
  if (bkTokens != null) out.ganon_bosskey_tokens = bkTokens;
  const bkHearts = count(imported, "Ganon's Boss Key Heart Count", "Ganon Boss Key Heart Count");
  if (bkHearts != null) out.ganon_bosskey_hearts = bkHearts;

  return out;
}

export function applyImportedLogicSettings(
  settings: Record<string, unknown>,
  imported: Record<string, string> = {},
): void {
  Object.assign(settings, importedLogicSettings(imported));
}
