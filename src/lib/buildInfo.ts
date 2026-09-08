import { CHANGELOG, type ChangelogEntry } from "../data/changelog";

export interface BuildInfo {
  /** Pages / GitHub Actions run number, or `local`. */
  build: string;
  /** Pull request being built, if CI knows one. */
  pr: string;
  /** Short commit SHA, or empty when running locally. */
  sha: string;
}

export interface DisplayChangelogEntry extends ChangelogEntry {
  current: boolean;
}

function readDefine(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function currentBuildInfo(): BuildInfo {
  return {
    build: readDefine(__PAGES_BUILD__, "local"),
    pr: readDefine(__PAGES_PR__, ""),
    sha: readDefine(__PAGES_SHA__, ""),
  };
}

export function formatBuildStamp(info: BuildInfo = currentBuildInfo()): string {
  if (info.pr) return `Pages build ${info.build} · PR ${info.pr}`;
  return `Pages build ${info.build}`;
}

export function pullRequestUrl(pr: number): string {
  return `https://github.com/tslackey/OOT-MM-Rando-Check-Trainer/pull/${pr}`;
}

export function stampChangelog(
  entries: ChangelogEntry[] = CHANGELOG,
  info: BuildInfo = currentBuildInfo(),
): DisplayChangelogEntry[] {
  return entries.map((entry) => {
    let build = entry.build;
    if (!build && info.build && info.build !== "local") {
      if (info.pr && entry.pr && String(entry.pr) === info.pr) {
        build = info.build;
      } else if (entry.pending) {
        build = info.build;
      }
    }
    return {
      ...entry,
      build,
      current: Boolean(build && build === info.build && info.build !== "local"),
    };
  });
}
