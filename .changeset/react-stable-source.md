---
"@adapttable/react": patch
---

`useFrontendData`, `useServerData` and `useTableData` return the same source object while nothing in it changes. A host that re-renders for its own state no longer re-renders every table row.
