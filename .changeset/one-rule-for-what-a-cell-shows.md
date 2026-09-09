---
"@adapttable/react": minor
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/chakra": patch
"@adapttable/antd": patch
"@adapttable/radix": patch
"@adapttable/base-ui": patch
"@adapttable/unstyled": patch
---

A kit's editable cell is handed `EditableCellRenderProps`: the slot's props
with the display already worked out — the display the row precomputed, the
column's own `Cell`, or its accessor. Six kits carried that rule line for
line; the binding resolves it once, in the same component boundary as before,
so the accessor still runs in the cell's own memo scope.
