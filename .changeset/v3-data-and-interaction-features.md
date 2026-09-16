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

Expand data processing, table organization and accessible interaction.

- Add spreadsheet-compatible `POWER` and `SQRT`, including numeric coercion
  and formula error handling.
- Support row reordering within groups and tree parents, cross-group and
  reparent moves, cycle prevention, and host-owned move policies and
  confirmation.
- Add independent pinned summary rows above or below grouped, tree and
  virtualized data.
- Add column renaming with stable keys and propagation to filters, exports,
  accessibility, mobile cards, URL state and Saved Views.
- Preserve find queries in URL state and recover from malformed, unsupported
  or oversized versioned state. Existing supported shared links remain
  readable.
- Window expanded group and tree entries when virtualization is enabled,
  including on paginated tables.
- Expose stable row/column lookup through the React grid-focus contract.
  Context-menu Copy targets the clicked cell outside a selection, preserves
  a selection when opened inside it, and is unavailable without a cell target.

Server-built all-row exports report progress, support cancellation and retry,
and accept host-provided download URLs. Completed progress can be dismissed.
Configure a retrieval route to enable all-row export; declaring the capability
alone does not fetch data or silently substitute the current page.

Improve high-contrast/forced-colors rendering, Ant Design header/cell grid
association, header-filter focus and persistence, row-move cancellation,
row-action event isolation, and Escape handling in nested controls.

The neutral engine does not publish a view revision when `setSearch`,
`setPage` or `setLimit` receives its current value. Subscribers are notified
when state changes, rather than for redundant setter calls.
