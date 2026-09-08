import { CHANGELOG } from "../data/changelog";
import { currentBuildInfo, formatBuildStamp, pullRequestUrl, stampChangelog } from "../lib/buildInfo";
import { setView } from "../state/store";

function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

export function Changelog() {
  const info = currentBuildInfo();
  const entries = stampChangelog(CHANGELOG, info);

  return (
    <div className="page">
      <header className="spread">
        <div>
          <p className="eyebrow">What's in this copy</p>
          <h1>Changes by build</h1>
        </div>
        <button type="button" className="ghost" onClick={() => setView("home")}>
          Back home
        </button>
      </header>

      <section className="card">
        <p className="eyebrow">This copy</p>
        <h2>{formatBuildStamp(info)}</h2>
        <p className="muted">
          The number is the GitHub Actions run that built this folder (GitLab uses the pipeline IID). Preview
          PR builds have their own number and are not the live Pages site. The highlighted row is the change
          that first shipped in this build when that is known.
        </p>
        {info.sha ? <p className="muted">Commit {info.sha}</p> : null}
      </section>

      <ol className="changelog">
        {entries.map((entry) => (
          <li key={`${entry.pr ?? "none"}-${entry.build ?? entry.title}`} className={entry.current ? "card changelog-item current" : "card changelog-item"}>
            <div className="changelog-meta">
              {entry.build ? <span className="chip">Build {entry.build}</span> : <span className="chip">Unreleased</span>}
              {entry.pr ? (
                <a className="chip" href={pullRequestUrl(entry.pr)} target="_blank" rel="noreferrer">
                  PR #{entry.pr}
                </a>
              ) : null}
              <span className="muted">{formatDate(entry.date)}</span>
              {entry.current ? <span className="age-pill">This build</span> : null}
            </div>
            <h2>{entry.title}</h2>
            <p>{entry.summary}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
