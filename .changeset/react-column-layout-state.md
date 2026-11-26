---
"@adapttable/react": major
"@adapttable/cli": minor
---

The React column layout publishes its sizing actions as `COLUMN_SIZING_STATE` (`ColumnSizingState`); the table chrome no longer carries `autoSizeColumns`, `autoSizeColumn` or `columnLayoutLive`, and the finished shell's `autoSizeColumns` and `autoSizeColumn` carry them. `adapttable migrate-v4` reports the removed fields.
