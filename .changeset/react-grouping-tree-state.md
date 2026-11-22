---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/antd": patch
"@adapttable/mantine": patch
"@adapttable/cli": minor
---

React grouping publishes its grouped rows as `GROUPING_STATE` (`GroupingState`) and the tree its hierarchy as `TREE_STATE` (`TreeState`); the table chrome no longer carries `grouping`, `tree`, `groupingArmed` or `treeShaped`, and the finished shell's `tableProps` carries them to the body. `KitPagerView` takes `tableProps.grouping` in place of `chrome.grouping`. Core's `BodyChrome` requires its `grouping` and `tree` keys, and `finishShellBody` reads them from `tableProps`. The grouping panel publishes its strip state as `GROUPING_PANEL_VIEW_STATE`, which the finished shell's `tableProps.groupingPanel` carries to the strip, the column menu and the header drag; the chrome's `groupingPanel`, the shell's `groupingPanelProps` and `DataTableShellGroupingPanelProps` are removed, and a table without the panel carries none of its code. `adapttable migrate-v4` reports the removed fields.
