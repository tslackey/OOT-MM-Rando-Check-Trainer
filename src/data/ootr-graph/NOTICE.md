# Vendored OoTR files for randomizer-graph-tool

Pinned graph-tool version string: `8.3.0 Release`
Upstream commit: `fbd0ed2b882fcbd5bd5e26f9d905daa8234f7f93` ([OoT-Randomizer](https://github.com/OoTRandomizer/OoT-Randomizer)).

Glitched World JSON is omitted; practice stays glitchless. MQ World JSON is
included because the graph builder loads both variants.

MIT: see `src/data/ootr/LICENSE`. These files are only used to build a local
`ExternalFileCache`. The app must not fetch GitHub at runtime.
