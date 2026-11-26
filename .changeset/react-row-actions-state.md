---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/antd": patch
"@adapttable/cli": minor
---

React row actions publish the trailing column and the row mutations as `ROW_ACTIONS_STATE` (`RowActionsState`), and row pinning publishes its pins as `ROW_PINNING_STATE`; the table chrome no longer carries `rowMutations`, `rowActions`, `hasRowActions` or `rowPinning`, and core's `OverlayChrome` treats `rowMutations` and `hasRowActions` as optional. The finished shell's `tableProps` carries them to the body, and the runtime view reads the pins. Row reorder's state is read from `ROW_REORDER`, now on `@adapttable/react/adapter`: the chrome no longer carries `hasRowReorder` or `rowReorder`, and the finished shell carries `hasRowReorder` and `tableProps.rowReorder`. `adapttable migrate-v4` reports the removed fields.
