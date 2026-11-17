---
"@adapttable/cli": patch
"@adapttable/core": minor
"@adapttable/i18n": patch
"@adapttable/server": minor
---

Server, CLI and i18n read from core.

- `@adapttable/core/query` carries everything a server needs to read a table link: the parameter names, `DEFAULT_LIMIT` and `MAX_LIMIT`, `FILTER_TYPE_OPS`, `parseDateOp`, `isListFilterOp`, `isValuelessFilterOp`, `parseGroupAggregateOverrides`, `splitListParam` and `safeDecode`.
- `@adapttable/server`'s `parseTableQuery` takes its limits, parameter names, operators and filter types from there, so every state the table writes reads back as the same query. It reads group aggregation (`groupAgg`) into `groupAggregates`, refusing columns outside the schema, and never throws on a sort key whose escape is not valid UTF-8. `splitListParam` replaces `splitFilterValues`, kept as a deprecated alias.
- A table that moves onto the server tier at runtime, or whose `onQueryChange` returns after a page change, asks the host for the page it is showing.
- `init` writes the React, Angular and Vue starters from one scaffold core; the files, commands and steps it prints are unchanged.
- Every locale is checked against core's per-feature label groups, so each language carries every string of every feature.
