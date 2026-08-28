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

Move the rule that decides whether a column header's funnel is lit into core, as
`hasActiveHeaderFilter`, so custom markup can light its own headers the way the adapters do.
Behaviour is unchanged in the seven adapters that now share it.
