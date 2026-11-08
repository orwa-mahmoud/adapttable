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
