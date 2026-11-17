---
"@adapttable/react": patch
"@adapttable/mui": patch
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/radix": patch
"@adapttable/unstyled": patch
---

Smaller React bundles with the same rendering: a plain adapter `DataTable` is 1.6–2.5 KiB lighter and a table with the standard preset 3.0–4.3 KiB lighter (min+gzip). The table's live-feature gate, its chrome hook and every kit's filter form are no longer compiled by the React Compiler, whose caches there never saved a render.
