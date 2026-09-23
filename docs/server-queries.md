# Server queries — parse and validate the table's query

The table puts its whole state in the URL. That is what makes a view
shareable and a page reloadable — and the moment that URL reaches a backend
it stops being state and becomes **user input**.

`limit=999999`. `sortBy=password`. A filter on a column that is not in the
table at all. Each is one fetch away from a slow query, a leaked field, or a
stack trace in a log.

```bash
npm install @adapttable/server
```

That is the whole install. The package runs in a route handler by definition,
so it holds no React: nothing in it renders, and nothing it imports does
either. An Express or Fastify service with no React in the project can install
it and parse.

## One call

```ts
import { parseTableQuery } from "@adapttable/server";

export async function GET(request: Request) {
  const query = parseTableQuery(request, {
    columns: ["name", "team", "budget"],
    maxLimit: 100,
  });

  return Response.json(await people(query));
}
```

`parseTableQuery` takes a `Request`, a `URL`, a query string or
`URLSearchParams` — so Next.js route handlers, Remix loaders and Server
Actions all work without an adapter — and returns a `ServerTableQuery`:

| Field            | What it is                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `page`           | 1-based, always at least 1                                                               |
| `limit`          | clamped to the schema's ceiling                                                          |
| `offset`         | `(page - 1) * limit`, computed once so every caller does not                             |
| `search`         | the free-text [search](./search.md) query, absent when there was none                    |
| `sort`           | the multi-sort chain, outermost first                                                    |
| `groupBy`        | a single grouping column, when the schema allows it                                      |
| `groupByKeys`    | every grouping key, outermost first — at every level, with `groupByKeys: true`           |
| `filters`        | column filters, keyed by the name after `f_`                                             |
| `shapedFilters`  | at level 0: each filter's operator beside it, a range's bounds joined, values as strings |
| `typedFilters`   | at levels 2 and 3: each declared filter typed, its operator and value checked            |
| `filterTree`     | the advanced AND/OR tree                                                                 |
| `pivot`          | the [pivot configuration](./pivot.md)                                                    |
| `pivotCollapsed` | the folded pivot groups, by collapse key                                                 |
| `cursor`         | the opaque cursor, in cursor mode                                                        |
| `rejected`       | everything it refused, and why                                                           |

## The schema is an allowlist

`columns` is the reason this package exists. A `sortBy` that reaches your
database because nobody checked it is a column name chosen by whoever sent
the request.

```ts
{
  columns: ["name", "team", "budget"],  // what a client may name
  maxLimit: 100,                        // the largest page it may ask for
  defaultLimit: 25,                     // when it asks for none
  urlKey: "left",                       // when two tables share one URL
}
```

A schema cannot raise `maxLimit` past the table's own ceiling of 500.

The parser reads `q`, `page`, `limit`, `sort` (or `sortBy` + `sortDir`),
every `f_*` param, `groupBy`, `ft`, `pivot` and `cursor`, each under the
`<urlKey>.` prefix when `urlKey` is set. Session-only params — `groupAgg`,
`groupClosed`, `rowPin`, `formula`, `density`, the `col*` layout — are not
read.

## Four levels of checking

How much the parser checks is the schema's choice:

| Level | Schema                   | Filters come back as                                                                                                            | Refused                                                                                             |
| ----- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 0     | `columns: "any"`         | `shapedFilters` — each filter's `op` beside it, a range's bounds joined into `{ min, max }` / `{ from, to }`, values as strings | Nothing for its name                                                                                |
| 1     | `columns: [...]`         | `filters` — one raw string per `f_*` param                                                                                      | A sort, filter, group, tree or pivot field outside `columns`                                        |
| 2     | `filters: { key: type }` | `typedFilters` — typed values, operators checked against the type                                                               | Level 1, plus an undeclared filter, an operator the type does not allow, a malformed number or date |
| 3     | `filters: FilterDef[]`   | `typedFilters`, as level 2                                                                                                      | Level 2, plus a value outside a static `select` / `multiSelect` / `checklist` option list           |

Level 0 still parses page, limit, sort, search, filters and the tree — it only
stops checking names. The names are then the client's own words: map them to
your fields, and never interpolate them into SQL.

A column-list schema without `filters` returns the fields in the table above
and no typed view. At levels 2 and 3 the typed filters are:

```ts
const query = parseTableQuery(request, {
  columns: ["name", "team", "budget", "hiredAt"],
  filters: {
    name: "text",
    team: "multiSelect",
    budget: "numberRange",
    hiredAt: "dateRange",
  },
});

query.typedFilters;
// {
//   name:    { type: "text", op: "contains", value: "ada" },
//   team:    { type: "multiSelect", op: "in", values: ["Core", "R&D"] },
//   budget:  { type: "numberRange", op: "between", min: 1000, max: 5000 },
//   hiredAt: { type: "dateRange", op: "gte", from: "2024-01-01" },
// }
```

When the link names no operator, a filter reads the way the table matches
it: text as `contains`, and a number or date range by the bounds it carries —
`between` for both (inclusive), `gte` for a lower bound alone, `lte` for an
upper bound alone. A date filter's `eq`, the table's other spelling of `on`,
arrives as `on`, in `typedFilters` and in the filter tree alike. A
relative date arrives as `{ op: "relative", relative: "last:7" }`, and a
`numberRange` `in` / `notIn` as `values`. Filter types the host registered go
in `filterTypes` (a `FilterTypeSpec` fits) and come back as
`{ type: "custom", filterType, op, value }`. At levels 2 and 3 the AND/OR
tree gets the same checks per condition: a declared key, an allowed operator,
a value of the type's shape — and, as always, one bad condition drops the
whole tree.

Level 3 takes the same `FilterDef` objects the browser passes to `filters(…)`
— import them on the server from wherever the table's definitions live. A
static `options` list is enforced; `options: "auto"` and a loader are accepted
as they are.

### Scoping filters by user or role

The schema is built per request, so permission is passing the subset a caller
may use:

```ts
import { parseTableQuery, pickFilters } from "@adapttable/server";

const query = parseTableQuery(request, {
  columns: COLUMNS,
  filters: pickFilters(FILTER_DEFS, allowedFilterKeys(user)),
});
```

A filter outside the subset is refused like any undeclared one.

### Multi-value filters and nested grouping

The table writes a multi-value filter (`multiSelect`, checklist) as ONE
parameter: entries joined with commas, each percent-encoded, so a value may
itself contain a comma. `typedFilters` splits it; at level 1 the raw string
is in `filters`, and `splitFilterValues(raw)` is the exact inverse.

`groupByKeys` lists every grouping key, outermost first
(`groupBy=team,status` → `["team", "status"]`), each checked against
`columns`. It is reported at every level when the schema sets
`groupByKeys: true`. `groupBy` keeps its single-key meaning.

### What replaces a hand-written workaround

| Hand-written                                                     | Declared instead                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `budgetMin` / `budgetMax` listed in `columns` to let a range in  | `filters: { budget: "numberRange" }` — one `typedFilters.budget` with `op`, `min` and `max`       |
| Splitting `"Core,Data"` on commas by hand                        | `splitFilterValues(raw)` at level 1, or a declared `multiSelect` / `checklist` for `values`       |
| `f_<key>Op` refused on a column list, so the operator is guessed | Declared `filters` — the operator is read, checked against the type and returned beside the value |
| Splitting `groupBy` on commas by hand                            | `groupByKeys` — every key, outermost first, each one checked                                      |

### Without a parser

A host that owns both ends can skip the URL entirely: send the
`TableQueryParams` object `onQueryChange` hands you as JSON, and read it on the
server as the typed object it already is. `parseTableQuery` is for the case the
URL is the request — a shared link, a server render, a route handler.

## Forgiving by default, strict on request

It never throws. Anything invalid is dropped and reported:

```ts
const query = parseTableQuery(request, schema);

query.rejected;
// [{ param: "sortBy", value: "password", reason: "not a sortable column" }]
```

A stale bookmark should give a sensible table, not a 500 — so the default is
to degrade. A route that would rather reject has the list to do it with:

```ts
if (query.rejected.length > 0) {
  return Response.json({ error: query.rejected }, { status: 400 });
}
```

## Filter trees are all or nothing

An unknown field discards the **whole** tree rather than one condition.
Dropping a single condition out of an AND quietly _widens_ the result set,
which is the one failure mode a filter must not have — a request that should
have returned three rows returning three thousand is worse than one that
returned none.

Sorting and pivoting are different: an unusable sort level or pivot field is
dropped on its own, because losing one level of an ordering is a smaller lie
than losing the ordering, and neither can widen anything.

A pivot parameter carries more than column names — whether subtotals and grand
totals are shown, and which groups are folded. Those are the client's view of
its own table, so they arrive as sent: the schema filters the axes and the
measures, and `pivot.subtotals`, `pivot.grandTotals` and `pivotCollapsed` pass
through. The folded keys are dimension **values** rather than columns — a team,
a region — so nothing can vouch for them and nothing pretends to: parameterise
them like a search term.

## The types

`parseTableQuery(input, schema)` takes a `QueryInput` — a `Request`, a `URL`,
a query string or `URLSearchParams` — plus a `QuerySchema`, and returns a
`ServerTableQuery`.

`QuerySchema` is the allowlist: `columns`, `filters`, `filterTypes`,
`groupByKeys`, `maxLimit`, `defaultLimit`, `urlKey`. Declared `filters` are
`ServerFilterDef`s — the `key`, `type` and optional `options` of a `FilterDef`,
which fits as it is — and `filterTypes` are `ServerFilterType`s (`type`, `ops`,
`defaultOp`), which a `FilterTypeSpec` fits. `ServerTableQuery` is the
table above, where `filters` values are `ServerFilterValue` (one string, or an
array for a repeated param), `shapedFilters` is `ShapedFilter` per key,
`typedFilters` is `TypedFilter` per key (`TextFilter`, `SelectFilter`,
`ListFilter`, `BooleanFilter`, `NumberRangeFilter`, `DateRangeFilter`,
`CustomTypedFilter`), `groupByKeys` lists every grouping key, `pivotCollapsed`
is absent rather than empty when nothing is folded, and `rejected` is a list of
`QueryRejection` — each carrying the `param` it came from, the `value` that
arrived, and the `reason` it was refused.

## Decoding a parameter yourself

`@adapttable/core/query` is the model without React — the encodings on their
own, which is what this package is built on:

```ts
import { deserializePivot, parseFilterTree } from "@adapttable/core/query";

const tree = parseFilterTree(params.get("ft"));
const config = deserializePivot(params.get("pivot"));
```

It exports the `ft=1.{…}` codec (`parseFilterTree`, `serializeFilterTree`,
`isActiveFilterTree`, `FILTER_TREE_PARAM`, `FILTER_TREE_VERSION`), the
`pivot=rows:…` codec (`serializePivot`, `deserializePivot`, and
`serializePivotState` / `deserializePivotState` for the folded groups as well),
the `formula=` codec (`serializeFormulaColumns`, `deserializeFormulaColumns`
— it yields formula text and never evaluates it), `isFilterGroup` for walking
a tree, and the types those speak in — `QueryCondition`, `QueryFilterGroup`,
`SortLevel`, `SortDirection`, `SortableValue`, `DisplayValue`, `PivotConfig`,
`PivotMeasure`, `PivotUrlState`, `FormulaColumnSpec`, `FormulaValue`,
`AggregateName`, `AggregateOrderedValue` and `Aggregator`. The filter model is
there too: `FILTER_TYPES`, `RANGE_SUFFIXES`, `FILTER_OP_SUFFIX`, `TEXT_OPS`,
`NUMBER_OPS`, `DATE_OPS`, `parseRelativeToken`, and the `FilterDef`,
`FilterType`, `FilterOption`, `FilterOptionsSource` and `FilterTypeSpec`
types.

Every one of those names is also on `@adapttable/core`,
`@adapttable/core/pivot` or `@adapttable/core/formula`, from the same source
module. The narrow entry leaves out the engine, sources and models, so a
backend loads only the codecs. Like every `@adapttable/core` entry it imports
no React and carries no `"use client"` boundary, and the encoding it reads is
the same one the table wrote.

Reach for it when you want the pieces; reach for `parseTableQuery` when you
want the allowlist, which is almost always.

Related: [data tiers](./data-tiers.md) · [URL state](./url-state.md) ·
[filtering](./filtering.md) · [pivot tables](./pivot.md)
