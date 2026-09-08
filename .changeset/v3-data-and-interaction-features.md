---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": minor
"@adapttable/base-ui": minor
"@adapttable/chakra": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/radix": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
"@adapttable/i18n": minor
---

Add data, editing and table-organization features:

- Spreadsheet-compatible `POWER` and `SQRT`, including numeric coercion
  and formula error handling.
- Row reordering within groups and tree parents, cross-group/reparent moves,
  cycle prevention, and host-owned move policies and confirmation.
- Independent pinned summary rows above or below grouped, tree and
  virtualized data.
- A native grouping panel with drag-and-drop, removable/reorderable chips,
  mobile controls, session aggregation overrides and saved state.
- Column renaming with stable keys and propagation to filters, export,
  accessibility, mobile cards, URL state and Saved Views.
- Find-query URL state and versioned URL-state recovery for malformed,
  unsupported or oversized input. Existing supported shared links remain
  readable.
- `selectorKey` on `useQuerySource` from `@adapttable/react` to re-project unchanged
  fetched pages with a changed selector.

Server-built all-row exports report progress, support cancellation and retry,
and offer host-provided download URLs. Completed progress can be dismissed.
An all-row capability declaration alone does not fetch data: configure a
retrieval route; otherwise the control is disabled rather than silently
exporting the current page.

Context-menu Copy targets the clicked cell when outside a selection, preserves
a selection when opened inside it, and is unavailable without a cell target.
The React grid-focus contract exposes stable row/column lookup for custom hosts.

Improve high-contrast/forced-colors rendering, Ant Design header/cell grid
association, header-filter focus and persistence, row-move cancellation,
row-action event isolation, and Escape handling in nested controls.
Optional feature isolation and bundle budgets cover published adapter roots;
native controls and headless customization remain available.
