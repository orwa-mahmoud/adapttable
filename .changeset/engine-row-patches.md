---
"@adapttable/core": patch
---

Both table engines evaluate rows with one evaluator. A row patch evaluates only the rows it changed and places them with one merge, so a 1,000-row patch on a 100,000-row grouped table takes 28 ms instead of 6 s, and no patch costs more than building the table from nothing. Building a table is up to 2.8× faster. Every snapshot stays valid after a patch: `applyRowPatchesToView` returns a new one and leaves the one it started from as it was.
