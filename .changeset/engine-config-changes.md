---
"@adapttable/core": patch
---

The table engine applies every configuration change: clearing a sort, a sort chain or a grouping takes effect, an array `groupBy` keeps all of its levels, and changing an aggregate operation, a named group order, `derivedKey` or `groupAggregateOps` re-derives the groups and totals. A discarded candidate leaves the committed table ready for the next change.
