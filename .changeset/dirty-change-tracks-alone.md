---
"@adapttable/react": patch
---

`editing(commit, { onDirtyChange })` tracks unsaved edits on its own and reports the real count without `dirtyIndicators()`; `dirtyIndicators()` adds the cell and row marks for the same set.
