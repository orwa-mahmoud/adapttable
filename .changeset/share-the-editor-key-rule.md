---
"@adapttable/core": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/chakra": patch
"@adapttable/antd": patch
"@adapttable/radix": patch
"@adapttable/base-ui": patch
"@adapttable/unstyled": patch
---

Share the rule that keeps an editor's own keys out of the table's key handler, as `stopEditKeys` on
`@adapttable/core/adapter`. Enter, Escape and Tab mean something to both an open editor and the grid
around it, and custom adapters need the same rule. Behaviour is unchanged in the seven adapters that
now share it.
