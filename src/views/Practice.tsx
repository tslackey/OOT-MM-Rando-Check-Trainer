import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../state/useAppState";
import { InProgressRuns } from "../components/InProgressRuns";
import { archiveSession, replaceCurrentSession, setView, updateSession } from "../state/store";
import { currentSession } from "../lib/runs";
import {
  collectCheck,
  createSession,
  clearFaroresWind,
  peekRemaining,
  respawnToSpawn,
  setFaroresWind,
  summarize,
  switchAge,
  togglePause,
  travelTo,
  warpFaroresWind,
  warpTo,
} from "../lib/session";
import {
  canShowWarpTab,
  inventoryGroups,
  isWrong,
  labeledItem,
  specialWarps,
  visibleExits,
  visibleRegionChecks,
  visibleWarps,
  type PracticeTab,
  type SpecialWarpId,
} from "../lib/practiceUi";
import { formatDuration, sessionElapsedMs } from "../lib/scoring";
import { REGION_BY_ID } from "../data/world";
import { hapticPenalty } from "../storage/persist";
import { downloadText } from "../lib/importRando";
import { exportSessionSpoiler } from "../lib/spoiler";
import type { WorldCheck } from "../data/types";

export function Practice() {
  const state = useAppState();
  const session = currentSession(state);
  const config = state.configs.find((entry) => entry.id === session?.configId);
  const [now, setNow] = useState(Date.now());
  const [peek, setPeek] = useState<WorldCheck[]>([]);
  const [tab, setTab] = useState<PracticeTab>("location");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.lastFlash?.tone === "bad") {
      void hapticPenalty();
    }
  }, [session?.lastFlash?.at, session?.lastFlash?.tone]);

  const regionChecks = useMemo(
    () => (session ? visibleRegionChecks(session, config) : []),
    [session, config],
  );
  const exits = useMemo(() => (session && config ? visibleExits(session, config) : []), [session, config]);
  const warps = useMemo(() => (session && config ? visibleWarps(session, config) : []), [session, config]);
  const extraWarps = useMemo(() => (session ? specialWarps(session) : []), [session]);
  const showWarpTab = Boolean(session && config && canShowWarpTab(session, config));
  const groups = useMemo(() => (session ? inventoryGroups(session.inventory) : []), [session]);

  useEffect(() => {
    if (!showWarpTab && tab === "warp") setTab("location");
  }, [showWarpTab, tab]);

  if (!session || !config) {
    return (
      <div className="page">
        <h1>No active run</h1>
        <p className="muted">Pick a configuration and start practicing, or resume a listed run.</p>
        <InProgressRuns />
        <button type="button" onClick={() => setView("configs")}>
          Open configs
        </button>
      </div>
    );
  }

  const region = REGION_BY_ID[session.currentRegionId];
  const elapsed = sessionElapsedMs({ ...session, now });
  const remaining = session.enabledCheckIds.length - session.collectedCheckIds.length;

  const apply = (next: typeof session) => {
    if (next.finishedAt && !session.finishedAt) {
      archiveSession(summarize(next));
      setView("stats");
      return;
    }
    updateSession(next);
  };

  return (
    <div className="page practice">
      <header className="practice-sticky">
        <div className="practice-top">
          <div>
            <p className="eyebrow">{session.configName}</p>
            <h1 className="location-name">{region?.name ?? session.currentRegionId}</h1>
            <p className="muted location-meta">
              <span className="age-pill">{session.age}</span>
              <span>
                spawn {REGION_BY_ID[session.age === "adult" ? session.adultSpawnId : session.childSpawnId]?.name ?? "?"}
              </span>
              <span>
                {session.collectedCheckIds.length}/{session.enabledCheckIds.length} · {remaining} left
              </span>
            </p>
          </div>
          <div className="meters">
            <span>{formatDuration(elapsed)}</span>
            <span className={session.penalties ? "bad" : ""}>
              {session.penalties} penalties / +{session.penaltySeconds}s
            </span>
          </div>
        </div>

        {session.lastFlash ? (
          <div className={`flash ${session.lastFlash.tone}`}>{session.lastFlash.text}</div>
        ) : null}

        <div className="practice-tabs" role="tablist" aria-label="Practice panels">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "location"}
            className={tab === "location" ? "practice-tab active" : "practice-tab"}
            onClick={() => setTab("location")}
          >
            Location
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "inventory"}
            className={tab === "inventory" ? "practice-tab active" : "practice-tab"}
            onClick={() => setTab("inventory")}
          >
            Inventory
          </button>
          {showWarpTab ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "warp"}
              className={tab === "warp" ? "practice-tab active" : "practice-tab"}
              onClick={() => setTab("warp")}
            >
              Warp
            </button>
          ) : null}
        </div>
      </header>

      {tab === "location" ? (
        <>
          <section>
            <h2>Go to</h2>
            <div className="btn-grid">
              {exits.map((connection) => {
                const dest = REGION_BY_ID[connection.to];
                return (
                  <button
                    key={connection.to}
                    type="button"
                    className={isWrong(session, connection.to) ? "go-btn wrong" : "go-btn"}
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
              {exits.length === 0 && session.currentRegionId !== "oot-tot" ? (
                <p className="muted">No paths for {session.age} from here.</p>
              ) : null}
            </div>
          </section>

          <section>
            <h2>Checks here</h2>
            <div className="btn-grid">
              {regionChecks.map((check) => (
                <button
                  key={check.id}
                  type="button"
                  className={isWrong(session, check.id) ? "go-btn wrong" : "go-btn"}
                  onClick={() => apply(collectCheck(session, config, check))}
                >
                  Check {check.name}
                </button>
              ))}
              {regionChecks.length === 0 ? (
                <p className="muted">No {session.age} checks left in this region.</p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {tab === "inventory" ? (
        <section>
          <h2>Inventory</h2>
          {groups.length ? (
            groups.map((group) => (
              <div key={group.title} className="inventory-group">
                <h3>{group.title}</h3>
                <div className="inventory">
                  {group.items.map((item) => (
                    <span key={item.id} className="chip">
                      {item.count > 1 ? `${labeledItem(item.id)} ×${item.count}` : labeledItem(item.id)}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No items yet. Clear checks to pick them up.</p>
          )}
        </section>
      ) : null}

      {tab === "warp" && showWarpTab ? (
        <>
          <section>
            <h2>Respawn & Farore's Wind</h2>
            <div className="btn-grid">
              {extraWarps.map((warp) => (
                <button
                  key={warp.id}
                  type="button"
                  className={isWrong(session, warp.id) ? "go-btn wrong" : "go-btn"}
                  onClick={() => {
                    const applySpecial = (id: SpecialWarpId) => {
                      if (id === "respawn") return respawnToSpawn(session, config);
                      if (id === "farores-set") return setFaroresWind(session, config);
                      if (id === "farores-return") return warpFaroresWind(session, config);
                      return clearFaroresWind(session, config);
                    };
                    apply(applySpecial(warp.id));
                  }}
                >
                  {warp.label}
                </button>
              ))}
            </div>
          </section>
          {warps.length ? (
            <section>
              <h2>Warp songs</h2>
              <div className="btn-grid">
                {warps.map((warp) => (
                  <button
                    key={warp.item}
                    type="button"
                    className={isWrong(session, warp.item) ? "go-btn wrong" : "go-btn"}
                    onClick={() => apply(warpTo(session, config, warp.item))}
                  >
                    {warp.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

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
            downloadText(
              `${session.configName.replace(/[^\w.-]+/g, "-").toLowerCase()}-spoiler.json`,
              exportSessionSpoiler(session, config),
            );
          }}
        >
          Spoiler
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            replaceCurrentSession(createSession(config));
            setPeek([]);
            setTab("location");
          }}
        >
          New seed
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
