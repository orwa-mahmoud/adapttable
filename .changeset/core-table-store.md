---
"@adapttable/core": minor
---

A table's view state lives in one table store, and a synced URL mirrors it: a change rewrites exactly the URL params it set, and a URL change reads back into the store. A table's listeners hear a view change only when the view itself changes, not when an unrelated part of the URL moves.

`@adapttable/core/binding` exports the table store (`createTableStore`, `defineSlice`, `defineAction`), the selection slice (`SELECTED_IDS`, its actions and `rowSelectedReader`, which is told only when that row's selection changes) and `controllableSlice`, a controllable value kept in a slice of the table's store. Controllable stores keep their own value in such a slice.
