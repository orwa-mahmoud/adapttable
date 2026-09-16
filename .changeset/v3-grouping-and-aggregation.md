---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/antd": minor
"@adapttable/base-ui": minor
"@adapttable/chakra": minor
"@adapttable/mantine": minor
"@adapttable/mui": minor
"@adapttable/radix": minor
"@adapttable/shadcn": minor
"@adapttable/unstyled": minor
"@adapttable/i18n": minor
---

Add a native grouping panel with draggable, removable and reorderable chips,
mobile controls, multiple active aggregations, and URL/Saved Views support.

### Column-owned configuration

- `groupable: false` excludes a column from grouping controls.
- `groupValue` lets a column group rows by a category, date bucket or range
  rather than its sort value.
- `aggregatable` declares whether a column can be aggregated, its available
  built-in or custom operations, and an optional default.
- Developer defaults drive the initial panel, calculations and server
  requests. Readers can add columns, change operations, remove an aggregation
  or restore the declared defaults. Suppression and operation choices are
  validated at execution, and custom operation IDs survive state round-trips.
- Date minimum and maximum compare ISO values. Grouped columns remain
  eligible for aggregation.
- A custom operation takes a `description`. Anything reading the table rather
  than looking at it is told what the operation does in the author's words;
  a built-in needs none.

Changes to aggregation choices invalidate cached group calculations through
`IncrementalViewConfig.derivedKey`. Stored multi-column grouping is read as
individual keys. Drag targets keep stable widths, and the remove target has
its own row rather than shifting the chips during a drag.

### Aggregate presentation and server responses

`formatAggregate(value, context)` formats group-header, group-footer and
mobile-card aggregates without changing their stored or exported values.
`AggregateFormatContext` supplies the column key and, when known, the
operation that produced the value, so a money column can display sums as
currency and counts as counts. `groupRowLayout`, `groupAggregateEntries` and
`groupAggregateNode` share this presentation path.

The existing `aggregate({ format })` option still formats at calculation
time, including for summary rows. If both formatters are configured, the
column receives the mapper's output; use raw group values with column
formatting, or explicitly handle already-formatted values.

Server-mode `DataTable` accepts host-declared `aggregates`. `useQuerySource`
and `useServerData` publish response-associated operations through
`TableSource.groupAggregations`; reader choices layer over host defaults.
The query binding associates responses with request keys and
`dataUpdatedAt`. Controlled sources return `responseKey` using the key
supplied by `onQueryChange` in `info.key`. Unmatched responses and unknown
custom operations remain unknown rather than inheriting another response's
operation. `queryAggregateOps` supports custom source implementations.
