---
"@adapttable/react": patch
---

The context menu builds its own inputs and wraps the table's root through its feature, so a table without `contextMenu()` no longer bundles that wiring.
