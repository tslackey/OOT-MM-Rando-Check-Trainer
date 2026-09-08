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
  REGION_BY_ID,
  spawnRegion,
  WORLD,
} from "../data/world";
import { adjustedMs, sessionElapsedMs } from "./scoring";
import { placeItems } from "./shuffle";

function event(partial: Omit<ActionEvent, "at"> & { at?: number }): ActionEvent {
  return { at: partial.at ?? Date.now(), ...partial };
}

export function startingInventory(config: RandoConfig): string[] {
  const items = [...flagsFor(config), ...(config.startingItems ?? [])];
  if (!config.randoSettings) {
    if (config.games.mm) items.push("ocarina", "song_of_time");
    if (config.openDoorOfTime) items.push("ocarina");
  }
  return [...new Set(items)];
}

export function createSession(config: RandoConfig, seed?: number): PracticeSession {
  const checks = enabledChecks(config);
  const now = Date.now();
  const generated = placeItems(checks, seed ?? now);
  return {
    id: crypto.randomUUID(),
    configId: config.id,
    configName: config.name,
    startedAt: now,
    updatedAt: now,
    pausedMs: 0,
    currentRegionId: spawnRegion(config),
    age: config.startingAge,
    inventory: startingInventory(config),
    collectedCheckIds: [],
    placement: { ...generated, ...config.importedPlacement },
    enabledCheckIds: checks.map((check) => check.id),
    log: [
      {
        at: now,
        kind: "resume",
        label: `Started in ${REGION_BY_ID[spawnRegion(config)]?.name ?? "spawn"}`,
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
  const connection = allOutgoing(session.currentRegionId).find((edge) => edge.to === regionId);
  if (!connection) {
    return penalize(
      session,
      config,
      `Go to ${REGION_BY_ID[regionId]?.name ?? regionId}`,
      "No path from here",
      { kind: "travel", regionId },
    );
  }
  if (!canUseConnection(connection, session.inventory, session.age)) {
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
  const allowed = availableWarps(session.inventory).some((entry) => entry.item === warpItem);
  if (!allowed) {
    return penalize(session, config, warp.label, "You don't have that song", { kind: "warp", regionId: warp.regionId });
  }
  return succeed(
    session,
    warp.label,
    { currentRegionId: warp.regionId },
    { kind: "warp", label: warp.label, ok: true, regionId: warp.regionId },
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
  if (!checkInLogic(check, session.inventory, session.age, session.currentRegionId)) {
    return penalize(session, config, label, "That check is not in logic", { checkId: check.id });
  }
  const item = session.placement[check.id] ?? "junk_1";
  const collected = [...session.collectedCheckIds, check.id];
  const inventory = session.inventory.includes(item) ? session.inventory : [...session.inventory, item];
  const done = collected.length >= session.enabledCheckIds.length;
  return succeed(
    session,
    `Got ${item.startsWith("junk_") ? "junk" : item.replaceAll("_", " ")}`,
    {
      collectedCheckIds: collected,
      inventory,
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
  if (!canSwitchAge(config, session.inventory, session.currentRegionId)) {
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
