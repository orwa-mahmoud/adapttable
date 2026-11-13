---
"@adapttable/server": minor
---

`parseTableQuery` reads the group aggregation a table writes (`groupAgg`) into `groupAggregates`, refusing columns outside the schema, and never throws on a sort key whose escape is not valid UTF-8. Page-size limits, parameter names, filter operators and filter types come from `@adapttable/core/query`, so every state the table's own store writes reads back as the same query. `splitListParam` replaces `splitFilterValues`, which stays as a deprecated alias.
