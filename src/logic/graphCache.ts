import files from "../data/ootr-graph/files.json";

/** Pinned OoTR release understood by `@mracsys/randomizer-graph-tool` 2.1.18. */
export const GRAPH_VERSION = "8.3.0 Release";

export const GRAPH_CACHE = {
  files: files as Record<string, string>,
  subfolder: "",
};
