---
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/chakra": minor
"@adapttable/antd": minor
"@adapttable/radix": minor
"@adapttable/base-ui": minor
"@adapttable/unstyled": minor
---

Export `DataTablePropsBase`, the half of each `DataTableProps` that carries every
prop except the data mode. Extending or wrapping a table's props meant restating
them, because the base was declared but never exported — the same shape core has
always exported as `BaseDataTableProps`.

`@adapttable/unstyled` also exports `IconProps`, which its icons already took.
