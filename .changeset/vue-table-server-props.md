---
"@adapttable/vue": minor
---

The table takes the server tier as props: `data` as the current page with `onQueryChange` fetches each query, described by `total`, `supports`, `aggregates`, `responseKey`, `facetKeys` and `facets`. `mode="frontend"` keeps the table's own processing and makes `onQueryChange` a notice of each change.
