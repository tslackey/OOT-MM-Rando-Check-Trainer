import { useEffect, useState } from "react";
import { Nav } from "./components/Nav";
import { Home } from "./views/Home";
import { Configs } from "./views/Configs";
import { ConfigEditor } from "./views/ConfigEditor";
import { Practice } from "./views/Practice";
import { Stats } from "./views/Stats";
import { Changelog } from "./views/Changelog";
import { formatBuildStamp } from "./lib/buildInfo";
import { bootStore, flushSave, setView } from "./state/store";
import { useAppState } from "./state/useAppState";

export function App() {
  const [ready, setReady] = useState(false);
  const state = useAppState();

  useEffect(() => {
    void bootStore().then(() => setReady(true));
    const onSave = () => flushSave();
    window.addEventListener("pagehide", onSave);
    window.addEventListener("beforeunload", onSave);
    return () => {
      window.removeEventListener("pagehide", onSave);
      window.removeEventListener("beforeunload", onSave);
    };
  }, []);

  useEffect(() => {
    const stamp = document.getElementById("build-stamp");
    if (!stamp) return;
    stamp.textContent = formatBuildStamp();
    stamp.setAttribute("title", "Open the changelog");
    const onOpen = () => setView("changelog");
    stamp.addEventListener("click", onOpen);
    return () => stamp.removeEventListener("click", onOpen);
  }, []);

  if (!ready) {
    return (
      <div className="boot">
        <p>Loading trainer…</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <Nav view={state.view} onChange={(view) => setView(view)} />
      <main>
        {state.view === "home" ? <Home /> : null}
        {state.view === "configs" ? <Configs /> : null}
        {state.view === "editor" ? <ConfigEditor /> : null}
        {state.view === "practice" ? <Practice /> : null}
        {state.view === "stats" ? <Stats /> : null}
        {state.view === "changelog" ? <Changelog /> : null}
      </main>
    </div>
  );
}
