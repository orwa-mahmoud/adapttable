---
"@adapttable/naive-ui": patch
---

Naive UI tables follow `n-config-provider` locale, a non-empty `rtl` list, and `componentOptions.DataTable.size`. An explicit `dir`, `labels` or `density` still wins. Omitting `rtl` leaves the page direction alone. A language AdaptTable has no labels for keeps the current copy. Naive UI has no app-wide motion switch.
