---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": patch
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/chakra": patch
"@adapttable/radix": patch
"@adapttable/base-ui": patch
"@adapttable/unstyled": patch
---

`formatAggregate` on a column says how an aggregate of it reads. A subtotal is
a number, and a number under a money column should read as money — including
after a reader switches that column to average or minimum from the grouping
strip, where until now the formatting the developer's `groupAggregates`
returned was replaced by the bare figure.

It is given the value and an `AggregateFormatContext`: the column key, and the
operation that produced it where the table knows it — the reader's own choice,
or the one a server was asked for — so a count reads as a count under the same
column. It runs where the cell is drawn, on group headers, group footers and
mobile group cards alike, so the value the table holds, exports and compares
stays the one the aggregate returned.

`groupRowLayout` and `groupAggregateEntries` take the group's
`GroupAggregateOps` and hand each cell through the column; `groupAggregateNode`
does one cell for a kit that lays out its own group rows.
