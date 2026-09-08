---
"@adapttable/react": patch
---

The checklist's distinct values and the row-reorder memo digest are the
engine's, and the React binding now re-exports them instead of carrying its
own copy of the same code. Both were duplicated line for line, which is two
places for the same rule to drift.
