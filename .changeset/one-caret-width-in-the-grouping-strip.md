---
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/chakra": patch
"@adapttable/radix": patch
"@adapttable/base-ui": patch
"@adapttable/react": patch
---

The grouping strip holds still while a chip is dragged. Insertion carets kept
one width at rest and another mid-drag, so grabbing a chip shoved every chip
after it sideways and the reader was left aiming at a target that had moved —
with three or more fields grouped, a reorder took several attempts or none at
all. The caret is one width now, and a drop anywhere on the strip that no chip
or caret answered adds the field at the end.
