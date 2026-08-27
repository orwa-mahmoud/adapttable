---
"@adapttable/core": patch
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/radix": patch
"@adapttable/unstyled": patch
---

State the real dataset size on a windowed mobile card list. The cards are a real `<ul>`, so a
virtualized or paged list now carries `aria-setsize` on each card with its absolute
`aria-posinset` — the list-shaped counterpart to the table's `aria-rowcount`. A list that holds
every card says nothing extra, because assistive technology can simply count.
