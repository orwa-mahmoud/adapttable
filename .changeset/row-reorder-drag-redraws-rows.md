---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": patch
---

Dragging a row redraws only the rows it crosses, not the table. In Mantine, MUI, Chakra and Ant Design each row a drag passes now takes about 10 ms instead of 13–25 ms on the row-reordering demos.

`RowReorderController.getTableSnapshot()` returns the state the table draws from, `RowReorderState.hover` follows the drop edge as a drag moves, and `withRowDropTarget` from `@adapttable/react/adapter` applies that edge to a row.
