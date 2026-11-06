---
"@adapttable/react": patch
"@adapttable/unstyled": patch
"@adapttable/antd": patch
"@adapttable/radix": patch
"@adapttable/mui": patch
"@adapttable/mantine": patch
"@adapttable/chakra": patch
"@adapttable/base-ui": patch
---

A plain React table no longer loads the editing session or the extra-row splicer. Enter-to-edit and batch undo recording run from the cell-navigation and editing entries, and extra rows are spliced only when `extraRows()` supplies the assembly.
