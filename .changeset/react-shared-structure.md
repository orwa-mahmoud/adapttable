---
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/react": minor
"@adapttable/unstyled": patch
---

Every React kit draws its desktop table and phone cards through one shared structure, `DesktopTableChrome` and `MobileCardsChrome`. Each kit still supplies its own table, rows, cells, cards and controls, and every table looks and behaves as before. `mobileCardSlots` builds the card list (order, pinned totals, groups, extra rows and each card's list-item attributes) and `mobileCardPropsEqual` is its card body's memo comparator, so a kit draws only its card host and body. A card now re-renders when the host passes a new `renderCard`, and a card offers no expand toggle without `renderRowDetail`, as the desktop table does.

A plain React table no longer loads the editing session or the extra-row splicer: enter-to-edit and batch undo come with the cell-navigation and editing features, and extra rows are spliced only when `extraRows()` is composed.

The MUI filters panel stays within the window below its trigger after the page shifts while it is open, and inside its left edge in a right-to-left page with a scrollbar.

A React kit can hand the binding one typed set of primitives (`KitPrimitives`: button, icon button, text input, select, checkbox, popover, menu, text) and get each feature's controls built from them: `createFindBar`, `createRowEditActions`, `createBatchEditBar`, `createAgentApproval`, `createTreeToggle`, `createTreeCell`, `createColumnGroupToggle`, `createGroupMoreButton`, `createRowReorderHandle`, `createRowReorderButtons`, `createEditableCellSlots`, `createFilterHeaderRow` and `createFilterHeaderControl`, all from `@adapttable/react/adapter`. The MUI kit draws these controls this way; its header multi-choice filter carries `filter-header-menu` on the panel that takes `classNames.filterHeaderMenu`, as the other kits do.
