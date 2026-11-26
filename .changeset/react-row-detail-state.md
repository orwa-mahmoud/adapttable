---
"@adapttable/react": major
"@adapttable/antd": patch
"@adapttable/cli": minor
---

React row detail publishes its renderer and expansion as `ROW_DETAIL_STATE` (`RowDetailState`); the table chrome no longer carries `detail`, and the finished shell's `tableProps.renderRowDetail` and `tableProps.expansion` carry it to the body. `adapttable migrate-v4` reports the removed field.
