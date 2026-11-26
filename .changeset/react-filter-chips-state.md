---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/cli": minor
---

The React filters feature publishes its chips and badge count as `FILTER_CHIPS_STATE` (`FilterChipsState`), which the toolbar badge, the chips bar and the command palette read. The table chrome no longer carries `mergedChips`, `activeFilterCount`, `filterDefs` or `filterRegistry`, the toolbar props drop `activeFilterCount`, and a table without the filters feature publishes no chips. `useChromeScrollReset(ref, props)` takes the root and the props. `adapttable migrate-v4` reports the removed names.
