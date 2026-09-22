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

| Field            | What it is                                                            |
| ---------------- | --------------------------------------------------------------------- |
| `page`           | 1-based, always at least 1                                            |
| `limit`          | clamped to the schema's ceiling                                       |
| `offset`         | `(page - 1) * limit`, computed once so every caller does not          |
| `search`         | the free-text [search](./search.md) query, absent when there was none |
| `sort`           | the multi-sort chain, outermost first                                 |
| `groupBy`        | a single grouping column, when the schema allows it                   |
| `filters`        | column filters, keyed by the name after `f_`                          |
| `filterTree`     | the advanced AND/OR tree                                              |
| `pivot`          | the [pivot configuration](./pivot.md)                                 |
| `pivotCollapsed` | the folded pivot groups, by collapse key                              |
| `cursor`         | the opaque cursor, in cursor mode                                     |
| `rejected`       | everything it refused, and why                                        |

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

Three encodings need care, because the parser checks names exactly as they
appear after `f_` and in `groupBy`:

- **Range filters** arrive under their bound keys: a `numberRange` on
  `budget` writes `f_budgetMin` / `f_budgetMax`, a `dateRange` on `hiredAt`
  writes `f_hiredAtFrom` / `f_hiredAtTo`. List those keys in `columns`
  (`["budget", "budgetMin", "budgetMax"]`), or they are rejected as
  `not a filterable column`.
- **Multi-value filters** (`multiSelect`, checklist) arrive as one
  comma-separated string with each entry percent-encoded, because that is
  how the table writes them. Split and decode them yourself:
  `value.split(",").map(decodeURIComponent)`. A repeated param is returned as
  an array.
- **Nested grouping** (`groupBy=team,status`) is compared as one name and
  rejected as `not a groupable column`; only a single-column `groupBy`
  passes. Read the raw param yourself when the table groups by more than one
  column.

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

`QuerySchema` is the allowlist: `columns`, `maxLimit`, `defaultLimit`,
`urlKey`. `ServerTableQuery` is the table above, where `filters` values are
`ServerFilterValue` (one string, or an array for a repeated param), `pivotCollapsed`
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
`AggregateName`, `AggregateOrderedValue` and `Aggregator`.

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
