/**
 * Download the OoTR files @mracsys/randomizer-graph-tool needs and write
 * an inlined cache. Run from the repo root. Do not fetch these at runtime
 * on GitHub Pages.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ExternalFileCacheList } from "@mracsys/randomizer-graph-tool";

const VERSION = "8.3.0 Release";
const COMMIT = "fbd0ed2b882fcbd5bd5e26f9d905daa8234f7f93";
const RAW = `https://raw.githubusercontent.com/OoTRandomizer/OoT-Randomizer/${COMMIT}`;

const SKIP_PREFIX = "data/Glitched World/";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src/data/ootr-graph");

const files = ExternalFileCacheList("ootr", VERSION).filter((path) => !path.startsWith(SKIP_PREFIX));

async function fetchText(path) {
  const url = `${RAW}/${path.split(" ").map(encodeURIComponent).join(" ")}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return await response.text();
}

const cache = {};
for (const path of files) {
  process.stderr.write(`fetch ${path}\n`);
  cache[path] = await fetchText(path);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "files.json"), JSON.stringify(cache));
writeFileSync(
  join(outDir, "NOTICE.md"),
  `# Vendored OoTR files for randomizer-graph-tool

Pinned graph-tool version string: \`${VERSION}\`
Upstream commit: \`${COMMIT}\` ([OoT-Randomizer](https://github.com/OoTRandomizer/OoT-Randomizer)).

Glitched World JSON is omitted; practice stays glitchless. MQ World JSON is
included because the graph builder loads both variants.

MIT: see \`src/data/ootr/LICENSE\`. These files are only used to build a local
\`ExternalFileCache\`. The app must not fetch GitHub at runtime.
`,
);
process.stderr.write(`wrote ${files.length} files\n`);
