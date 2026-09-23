---
"@adapttable/react": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/chakra": minor
"@adapttable/antd": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
---

A `<DataTable>` hands its edit state to the host through the features that own it: `editHistory({ onChange })` gives undo, redo, `canUndo`, `canRedo` and `clear` for your own buttons, `editing(commit, { onDirtyChange })` the unsaved-edit count with `confirm`, `confirmRow` and `confirmAll`, and `cellNavigation({ onRangeChange })` the selected cell range. Each reports on mount and whenever it changes.
