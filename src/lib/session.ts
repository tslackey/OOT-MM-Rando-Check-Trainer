import { createConfig } from "../data/presets";
import type {
  ActionEvent,
  Age,
  PracticeSession,
  RandoConfig,
  SessionSummary,
  WorldCheck,
} from "../data/types";
import {
  allOutgoing,
  availableWarps,
  canSwitchAge,
  canUseConnection,
  checkInLogic,
  enabledChecks,
  flagsFor,
  itemLabel,
  REGION_BY_ID,
  sessionEvents,
  WORLD,
} from "../data/world";
import { adjustedMs, sessionElapsedMs } from "./scoring";
import { generateSpoiler, startingRegion } from "./spoiler";

function event(partial: Omit<ActionEvent, "at"> & { at?: number }): ActionEvent {
  return { at: partial.at ?? Date.now(), ...partial };
}

function logicEvents(session: PracticeSession): string[] {
  return sessionEvents(session.collectedCheckIds, session.logicEvents ?? []);
}

export function startingInventory(config: RandoConfig): string[] {
  const items = [...flagsFor(config), ...(config.startingItems ?? [])];
  if (!config.randoSettings && config.openDoorOfTime) items.push("ocarina");
  return [...new Set(items)];
}

export function createSession(config: RandoConfig, seed?: number): PracticeSession {
  const checks = enabledChecks(config);
  const now = Date.now();
  const spoiler = generateSpoiler(config, seed ?? now);
  const start = startingRegion(spoiler);
  return {
    id: crypto.randomUUID(),
    configId: config.id,
    configName: config.name,
    startedAt: now,
    updatedAt: now,
    pausedMs: 0,
    currentRegionId: start,
    age: spoiler.startingAge,
    childSpawnId: spoiler.childSpawnId,
    adultSpawnId: spoiler.adultSpawnId,
    faroresRegionId: null,
    seed: spoiler.seed,
    inventory: startingInventory(config),
    collectedCheckIds: [],
    wrongIds: [],
    placement: spoiler.placement,
    enabledCheckIds: checks.map((check) => check.id),
    log: [
      {
        at: now,
        kind: "resume",
        label: `Started ${spoiler.startingAge} in ${REGION_BY_ID[start]?.name ?? "spawn"}`,
        ok: true,
      },
    ],
    penalties: 0,
    penaltySeconds: 0,
    peekUsed: 0,
  };
}

function bump(session: PracticeSession, patch: Partial<PracticeSession>): PracticeSession {
  return { ...session, ...patch, updatedAt: Date.now() };
}

function wrongKey(extra: Partial<ActionEvent>): string | undefined {
  return extra.checkId ?? extra.item ?? extra.regionId;
}

function withWrong(session: PracticeSession, extra: Partial<ActionEvent>): string[] {
  const current = session.wrongIds ?? [];
  const key = wrongKey(extra);
  if (!key || current.includes(key)) return current;
  return [...current, key];
}

function withoutWrong(session: PracticeSession, extra: Partial<ActionEvent>): string[] {
  const current = session.wrongIds ?? [];
  const key = wrongKey(extra);
  if (!key) return current;
  return current.filter((id) => id !== key);
}

function penalize(
  session: PracticeSession,
  config: RandoConfig,
  label: string,
  reason: string,
  extra: Partial<ActionEvent> = {},
  seconds = config.penaltySeconds,
): PracticeSession {
  const flash = { tone: "bad" as const, text: reason, at: Date.now() };
  return bump(session, {
    penalties: session.penalties + 1,
    penaltySeconds: session.penaltySeconds + seconds,
    lastFlash: flash,
    wrongIds: withWrong(session, extra),
    log: [
      ...session.log,
      event({
        kind: extra.kind ?? "check",
        label,
        ok: false,
        reason,
        ...extra,
      }),
    ],
  });
}

function succeed(
  session: PracticeSession,
  text: string,
  extra: Partial<PracticeSession>,
  log: Omit<ActionEvent, "at">,
): PracticeSession {
  return bump(session, {
    ...extra,
    lastFlash: { tone: "ok", text, at: Date.now() },
    wrongIds: withoutWrong(session, log),
    log: [...session.log, event(log)],
  });
}

export function travelTo(
  session: PracticeSession,
  config: RandoConfig,
  regionId: string,
): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  if (regionId === session.currentRegionId) {
    return penalize(session, config, `Go to ${REGION_BY_ID[regionId]?.name ?? regionId}`, "Already here", {
      kind: "travel",
      regionId,
    });
  }
  const connection = allOutgoing(session.currentRegionId, config.games).find((edge) => edge.to === regionId);
  if (!connection) {
    return penalize(
      session,
      config,
      `Go to ${REGION_BY_ID[regionId]?.name ?? regionId}`,
      "No path from here",
      { kind: "travel", regionId },
    );
  }
  if (!canUseConnection(connection, session.inventory, session.age, config, logicEvents(session))) {
    return penalize(
      session,
      config,
      `Go to ${REGION_BY_ID[regionId]?.name ?? regionId}`,
      "That path is not in logic",
      { kind: "travel", regionId },
    );
  }
  const name = REGION_BY_ID[regionId]?.name ?? regionId;
  return succeed(
    session,
    `Arrived at ${name}`,
    { currentRegionId: regionId },
    { kind: "travel", label: `Go to ${name}`, ok: true, regionId },
  );
}

export function warpTo(
  session: PracticeSession,
  config: RandoConfig,
  warpItem: string,
): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  const warp = WORLD.warps.find((entry) => entry.item === warpItem);
  if (!warp) {
    return penalize(session, config, `Warp ${warpItem}`, "Unknown warp", { kind: "warp" });
  }
  const allowed = availableWarps(session.inventory, session.age, config, logicEvents(session)).some(
    (entry) => entry.item === warpItem,
  );
  if (!allowed) {
    return penalize(session, config, warp.label, "You don't have that song", {
      kind: "warp",
      regionId: warp.regionId,
      item: warpItem,
    });
  }
  return succeed(
    session,
    warp.label,
    { currentRegionId: warp.regionId },
    { kind: "warp", label: warp.label, ok: true, regionId: warp.regionId, item: warpItem },
  );
}

export function ageSpawnId(session: PracticeSession): string {
  return session.age === "adult" ? session.adultSpawnId : session.childSpawnId;
}

export function respawnToSpawn(session: PracticeSession, config: RandoConfig): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  const regionId = ageSpawnId(session);
  const name = REGION_BY_ID[regionId]?.name ?? regionId;
  if (regionId === session.currentRegionId) {
    return penalize(session, config, `Respawn to ${name}`, "Already at spawn", {
      kind: "warp",
      regionId,
      item: "respawn",
    });
  }
  return succeed(
    session,
    `Respawned at ${name}`,
    { currentRegionId: regionId },
    { kind: "warp", label: `Respawn to ${name}`, ok: true, regionId, item: "respawn" },
  );
}

function hasFaroresWind(inventory: string[]): boolean {
  return inventory.includes("farores") && inventory.includes("magic");
}

export function setFaroresWind(session: PracticeSession, config: RandoConfig): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  const region = REGION_BY_ID[session.currentRegionId];
  if (!session.inventory.includes("farores")) {
    return penalize(session, config, "Set Farore's Wind", "You don't have Farore's Wind", {
      kind: "warp",
      item: "farores-set",
    });
  }
  if (!session.inventory.includes("magic")) {
    return penalize(session, config, "Set Farore's Wind", "Need magic to cast Farore's Wind", {
      kind: "warp",
      item: "farores-set",
    });
  }
  if (!region?.dungeon) {
    return penalize(session, config, "Set Farore's Wind", "Farore's Wind only sets in a dungeon", {
      kind: "warp",
      item: "farores-set",
      regionId: session.currentRegionId,
    });
  }
  return succeed(
    session,
    `Farore's Wind set in ${region.name}`,
    { faroresRegionId: session.currentRegionId },
    { kind: "warp", label: `Set Farore's Wind (${region.name})`, ok: true, regionId: session.currentRegionId, item: "farores-set" },
  );
}

export function warpFaroresWind(session: PracticeSession, config: RandoConfig): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  if (!hasFaroresWind(session.inventory)) {
    return penalize(session, config, "Farore's Wind", "Need Farore's Wind and magic", {
      kind: "warp",
      item: "farores-return",
    });
  }
  const regionId = session.faroresRegionId;
  if (!regionId) {
    return penalize(session, config, "Farore's Wind", "No Farore's Wind point set", {
      kind: "warp",
      item: "farores-return",
    });
  }
  const name = REGION_BY_ID[regionId]?.name ?? regionId;
  if (regionId === session.currentRegionId) {
    return penalize(session, config, `Farore's Wind (${name})`, "Already at your warp point", {
      kind: "warp",
      regionId,
      item: "farores-return",
    });
  }
  return succeed(
    session,
    `Warped to ${name}`,
    { currentRegionId: regionId },
    { kind: "warp", label: `Farore's Wind (${name})`, ok: true, regionId, item: "farores-return" },
  );
}

export function clearFaroresWind(session: PracticeSession, config: RandoConfig): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  if (!session.faroresRegionId) {
    return penalize(session, config, "Clear Farore's Wind", "No Farore's Wind point set", {
      kind: "warp",
      item: "farores-clear",
    });
  }
  return succeed(
    session,
    "Farore's Wind cleared",
    { faroresRegionId: null },
    { kind: "warp", label: "Clear Farore's Wind", ok: true, item: "farores-clear" },
  );
}

export function collectCheck(
  session: PracticeSession,
  config: RandoConfig,
  check: WorldCheck,
): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  const label = `Check ${check.name}`;
  if (!session.enabledCheckIds.includes(check.id)) {
    return penalize(session, config, label, "Not in this settings preset", { checkId: check.id });
  }
  if (session.collectedCheckIds.includes(check.id)) {
    return penalize(session, config, label, "Already collected", { checkId: check.id });
  }
  if (check.regionId !== session.currentRegionId) {
    return penalize(session, config, label, "You are not in that region", { checkId: check.id, regionId: check.regionId });
  }
  if (!checkInLogic(check, session.inventory, session.age, session.currentRegionId, config, logicEvents(session))) {
    return penalize(session, config, label, "That check is not in logic", { checkId: check.id });
  }
  const item = session.placement[check.id] ?? "junk_1";
  const collected = [...session.collectedCheckIds, check.id];
  const inventory = session.inventory.includes(item) ? session.inventory : [...session.inventory, item];
  const done = collected.length >= session.enabledCheckIds.length;
  return succeed(
    session,
    `Got ${item.startsWith("junk_") ? "junk" : itemLabel(item)}`,
    {
      collectedCheckIds: collected,
      inventory,
      logicEvents: sessionEvents(collected, session.logicEvents ?? []),
      finishedAt: done ? Date.now() : session.finishedAt,
    },
    { kind: "check", label, ok: true, checkId: check.id, item },
  );
}

export function peekRemaining(
  session: PracticeSession,
  config: RandoConfig,
): { session: PracticeSession; remaining: WorldCheck[] } {
  if (session.pausedAt || session.finishedAt) {
    return { session, remaining: [] };
  }
  const remaining = enabledChecks(config).filter((check) => !session.collectedCheckIds.includes(check.id));
  const next = bump(session, {
    peekUsed: session.peekUsed + 1,
    penalties: session.penalties + 1,
    penaltySeconds: session.penaltySeconds + config.peekPenaltySeconds,
    lastFlash: {
      tone: "bad",
      text: `Peeked ${remaining.length} remaining (+${config.peekPenaltySeconds}s)`,
      at: Date.now(),
    },
    log: [
      ...session.log,
      event({
        kind: "peek",
        label: "Peek remaining checks",
        ok: false,
        reason: "Tracker peek",
      }),
    ],
  });
  return { session: next, remaining };
}

export function togglePause(session: PracticeSession): PracticeSession {
  if (session.finishedAt) return session;
  if (session.pausedAt) {
    return bump(session, {
      pausedAt: undefined,
      pausedMs: session.pausedMs + (Date.now() - session.pausedAt),
      log: [...session.log, event({ kind: "resume", label: "Resumed", ok: true })],
    });
  }
  return bump(session, {
    pausedAt: Date.now(),
    log: [...session.log, event({ kind: "pause", label: "Paused", ok: true })],
  });
}

export function switchAge(session: PracticeSession, config: RandoConfig): PracticeSession {
  if (session.pausedAt || session.finishedAt) return session;
  if (!canSwitchAge(config, session.inventory, session.currentRegionId, logicEvents(session))) {
    return penalize(session, config, "Change age", "Need the Temple of Time (and Door of Time)", {
      kind: "travel",
    });
  }
  const nextAge: Exclude<Age, "any"> = session.age === "child" ? "adult" : "child";
  return succeed(
    session,
    `Now ${nextAge}`,
    { age: nextAge },
    { kind: "travel", label: `Become ${nextAge}`, ok: true },
  );
}

export function summarize(session: PracticeSession): SessionSummary {
  const elapsedMs = sessionElapsedMs(session);
  const collected = session.collectedCheckIds.length;
  const total = session.enabledCheckIds.length;
  return {
    id: session.id,
    configId: session.configId,
    configName: session.configName,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt ?? session.updatedAt,
    elapsedMs,
    adjustedMs: adjustedMs(elapsedMs, session.penaltySeconds),
    collected,
    total,
    penalties: session.penalties,
    peekUsed: session.peekUsed,
    completed: collected >= total && total > 0,
  };
}

export function cloneConfig(config: RandoConfig, name?: string): RandoConfig {
  return createConfig({
    ...config,
    id: crypto.randomUUID(),
    name: name ?? `${config.name} copy`,
    updatedAt: Date.now(),
  });
}
