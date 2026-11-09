---
"@adapttable/core": minor
"@adapttable/react": patch
---

Dragging over the grouping strip redraws only the strip. The table redraws when a column header's drag starts or ends, never while a drag hovers: on a table of 161 grouped rows each drag move takes under 10 ms instead of about 90 ms.

`GroupingPanelController.getTableSnapshot()` returns the state the table draws from, and the panel interactions carry `live`, the drag and announcement the strip follows.
