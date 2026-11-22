---
"@adapttable/cli": minor
---

`adapttable migrate-v4 [paths...] [--check]` upgrades v3 source: it moves every import v4 moved to the entry that serves it now, keeps a renamed export under the name the file already uses, redirects moved subpaths, and reports each change of meaning or shape with its file, line and column.
