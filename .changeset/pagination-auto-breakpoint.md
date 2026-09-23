---
"@adapttable/react": patch
---

`paginationMode="auto"` follows the table's `mobileBreakpoint` and `forceMobile`, so infinite scroll and the card layout switch together, and a server render with `forceMobile` resolves the same mode as the first client render. `useFrontendData`, `useServerData` and `useQuerySource` take `mobileBreakpoint`.
