---
"@adapttable/core": minor
---

`@adapttable/core/query` carries everything a server needs to read a table link: the parameter names (`PARAM_PAGE`, `PARAM_LIMIT`, `PARAM_SEARCH`, `PARAM_SORT`, `PARAM_SORT_BY`, `PARAM_SORT_DIR`, `PARAM_GROUP_BY`, `PARAM_GROUP_AGGREGATES`, `PARAM_PIVOT`, `FILTER_PREFIX`), `DEFAULT_LIMIT` and `MAX_LIMIT`, `FILTER_TYPE_OPS` (each built-in filter type's operators and default), `parseDateOp`, `isListFilterOp`, `isValuelessFilterOp`, `parseGroupAggregateOverrides`, `splitListParam` and `safeDecode`. `FILTER_TYPE_OPS`, `FilterTypeOps`, `PARAM_SORT`, `splitListParam` and `safeDecode` are also new on `@adapttable/core`. The pivot, formula and group-aggregate codecs share one decoder, so tables that use them ship a little less code.
