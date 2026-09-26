---
"@adapttable/core": minor
"@adapttable/react": patch
---

Core exports the table's state layer for any framework binding: `TableOptions` and the runtime contracts, the history and memory URL adapters, a view-state store for everything the table writes to the URL, the data-tier controller (tier resolution, `onQueryChange`, aborts, `refetch`, cursor and infinite paging), and controllable selection, expansion, pinning and column-layout stores. `@adapttable/react` runs on them with its API and behaviour unchanged.
