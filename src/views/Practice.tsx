import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../state/useAppState";
import { archiveSession, setActiveSession, setView } from "../state/store";
import {
  collectCheck,
  createSession,
  peekRemaining,
  summarize,
  switchAge,
  togglePause,
  travelTo,
  warpTo,
} from "../lib/session";
import { formatDuration, sessionElapsedMs } from "../lib/scoring";
import {
  REGION_BY_ID,
  WORLD,
  allOutgoing,
  canUseConnection,
  itemLabel,
} from "../data/world";
import { hapticPenalty } from "../storage/persist";
import type { WorldCheck } from "../data/types";

export function Practice() {
  const state = useAppState();
  const session = state.activeSession;
  const config = state.configs.find((entry) => entry.id === session?.configId);
  const [now, setNow] = useState(Date.now());
  const [peek, setPeek] = useState<WorldCheck[]>([]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.lastFlash?.tone === "bad") {
      void hapticPenalty();
    }
  }, [session?.lastFlash?.at, session?.lastFlash?.tone]);

  const regionChecks = useMemo(() => {
    if (!session) return [];
    return WORLD.checks.filter((check) => {
      if (check.regionId !== session.currentRegionId) return false;
      if (!session.enabledCheckIds.includes(check.id)) return false;
      if (config?.hideCompleted && session.collectedCheckIds.includes(check.id)) return false;
      return true;
    });
  }, [session, config?.hideCompleted]);

  if (!session || !config) {
    return (
      <div className="page">
        <h1>No active run</h1>
        <p className="muted">Pick a configuration and start practicing.</p>
        <button type="button" onClick={() => setView("configs")}>
          Open configs
        </button>
      </div>
    );
  }

  const region = REGION_BY_ID[session.currentRegionId];
  const elapsed = sessionElapsedMs({ ...session, now });
  const remaining = session.enabledCheckIds.length - session.collectedCheckIds.length;
  const exits = allOutgoing(session.currentRegionId).filter((connection) => {
    const ok = canUseConnection(connection, session.inventory, session.age);
    return config.hideLocked ? ok : true;
  });
  const uniqueExits = [...new Map(exits.map((connection) => [connection.to, connection])).values()];
  const warps = WORLD.warps.filter((warp) => {
    const dest = REGION_BY_ID[warp.regionId];
    if (dest && !config.games[dest.game]) return false;
    if (!config.hideLocked) return true;
    if (warp.item.startsWith("soaring")) return session.inventory.includes("soaring");
    return session.inventory.includes(warp.item);
  });

  const apply = (next: typeof session) => {
    if (next.finishedAt && !session.finishedAt) {
      archiveSession(summarize(next));
      setView("stats");
      return;
    }
    setActiveSession(next);
  };

  return (
    <div className="page practice">
      <header className="practice-top">
        <div>
          <p className="eyebrow">{session.configName}</p>
          <h1>{region?.name ?? session.currentRegionId}</h1>
          <p className="muted">
            {session.age} · {session.collectedCheckIds.length}/{session.enabledCheckIds.length} ·{" "}
            {remaining} left
          </p>
        </div>
        <div className="meters">
          <span>{formatDuration(elapsed)}</span>
          <span className={session.penalties ? "bad" : ""}>
            {session.penalties} penalties / +{session.penaltySeconds}s
          </span>
        </div>
      </header>

      {session.lastFlash ? (
        <div className={`flash ${session.lastFlash.tone}`}>{session.lastFlash.text}</div>
      ) : null}

      <div className="inventory">
        {session.inventory
          .filter((item) => !item.startsWith("open_") && item !== "cross_game")
          .slice(-12)
          .map((item) => (
            <span key={item} className="chip">
              {itemLabel(item)}
            </span>
          ))}
      </div>

      <section>
        <h2>Go to</h2>
        <div className="btn-grid">
          {uniqueExits.map((connection) => {
            const dest = REGION_BY_ID[connection.to];
            return (
              <button
                key={connection.to}
                type="button"
                className="go-btn"
                onClick={() => apply(travelTo(session, config, connection.to))}
              >
                Go to {dest?.name ?? connection.to}
              </button>
            );
          })}
          {session.currentRegionId === "oot-tot" ? (
            <button type="button" className="go-btn" onClick={() => apply(switchAge(session, config))}>
              Become {session.age === "child" ? "adult" : "child"}
            </button>
          ) : null}
        </div>
      </section>

      {warps.length ? (
        <section>
          <h2>Warp</h2>
          <div className="btn-grid">
            {warps.map((warp) => (
              <button
                key={warp.item}
                type="button"
                className="ghost go-btn"
                onClick={() => apply(warpTo(session, config, warp.item))}
              >
                {warp.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2>Checks here</h2>
        <div className="btn-grid">
          {regionChecks.map((check) => (
              <button
                key={check.id}
                type="button"
                className="go-btn"
                onClick={() => apply(collectCheck(session, config, check))}
              >
                Check {check.name}
              </button>
            ))}
          {regionChecks.length === 0 ? <p className="muted">No enabled checks in this region.</p> : null}
        </div>
      </section>

      {peek.length ? (
        <section className="card peek">
          <h2>Remaining (peek)</h2>
          <ul className="plain">
            {peek.slice(0, 24).map((check) => (
              <li key={check.id}>
                {check.name} · {REGION_BY_ID[check.regionId]?.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="practice-foot">
        <button
          type="button"
          className="ghost"
          onClick={() => apply(togglePause(session))}
          disabled={Boolean(session.finishedAt)}
        >
          {session.pausedAt ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const result = peekRemaining(session, config);
            setPeek(result.remaining);
            apply(result.session);
          }}
        >
          Peek remaining
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setActiveSession(createSession(config));
            setPeek([]);
          }}
        >
          Restart
        </button>
        <button
          type="button"
          className="ghost danger"
          onClick={() => {
            archiveSession(summarize(session));
            setView("stats");
          }}
        >
          End run
        </button>
      </footer>
    </div>
  );
}
