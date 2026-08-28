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
`hasActiveHeaderFilter`. All seven adapters carried a byte-identical copy of it, and it is the kind
of rule that is easy to get subtly wrong: a cleared text field leaves `""`, a cleared multi-select
leaves `[]`, and a control nobody touched leaves `undefined` — none of them a filter, and a funnel
lit for one sends a reader looking for something that is not there. Behaviour is unchanged; it can
now only be wrong in one place, and it is covered there.
