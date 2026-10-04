---
"@adapttable/core": patch
---

Keep context-menu targets within their owning table, including nested mobile
cards, and exclude summary rows from data-row actions.

Retire pending export results when their controller disconnects. Preserve a new
export started during cancellation, and ignore synchronous results from a run
that was retired while its host callback was executing.
