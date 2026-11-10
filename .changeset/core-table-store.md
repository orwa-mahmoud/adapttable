---
"@adapttable/core": patch
---

A table's view state lives in one table store, and a synced URL mirrors it: a change rewrites exactly the URL params it set, and a URL change reads back into the store. A table's listeners hear a view change only when the view itself changes, not when an unrelated part of the URL moves.
