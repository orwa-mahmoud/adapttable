---
"@adapttable/core": patch
---

Grouping a table no longer throws when the row array carries the basic engine's view. That view is not an incremental snapshot, so the grouped model is built for it, and a full-engine snapshot still reconfigures and patches.
