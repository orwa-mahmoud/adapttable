---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/mantine": major
"@adapttable/mui": major
"@adapttable/chakra": major
"@adapttable/antd": major
"@adapttable/radix": major
"@adapttable/base-ui": major
"@adapttable/unstyled": major
"@adapttable/shadcn": major
---

Copy in the context menu acts on the cell it was opened over. Right-clicking a
cell with nothing selected copies that cell; right-clicking inside a selection
keeps the selection, which is the rectangle the reader built; right-clicking
outside one copies the cell under the cursor rather than a selection somewhere
else. A menu that names no cell — a right-click on a row outside any column —
greys Copy out instead of copying whatever was selected last.

`GridFocusState.cellAt(rowId, columnKey)` resolves a row and column key to a
grid address against the rows and columns that grid was handed, so the answer
follows the sort, the filter, the page, pinned rows and the virtual window.
`contextMenuCopyTarget` decides which of the three cases applies, and
`useGridFocus` takes `getRowId` to make the lookup possible.
