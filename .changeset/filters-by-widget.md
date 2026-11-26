---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/unstyled": patch
---

A filters feature carries only the filter types its widgets draw. Each widget can name its rules (`textFilterSpecs()`, `rangeFilterSpecs()`, …) and `filterEngineForWidgets` builds an engine from them, so an Unstyled table with `filtersWith([textFilterWidget])` loads 1.7 KiB gzip less; custom `filterTypes` still layer on top. `evaluateFilterTree`, `conditionToExtra` and the React `FilterTreeChrome` / `FilterTreeBuilder` now take the table's `registry` instead of defaulting to every built-in type.
