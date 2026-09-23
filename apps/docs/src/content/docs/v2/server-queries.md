---
title: "React table server queries — parse and validate (v2)"
description: Parse and validate AdaptTable's URL state on the server — typed
  queries for filtering, sorting and paging your backend can trust.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table server queries — parse and
      validate","item":"https://orwa-mahmoud.github.io/adapttable/v2/server-queries/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/server-queries.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/server-queries.png
slug: v2/server-queries
---

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

| Field            | What it is                                                   |
| ---------------- | ------------------------------------------------------------ |
| `page`           | 1-based, always at least 1                                   |
| `limit`          | clamped to the schema's ceiling                              |
| `offset`         | `(page - 1) * limit`, computed once so every caller does not |
| `search`         | the free-text query, absent when there was none              |
| `sort`           | the multi-sort chain, outermost first                        |
| `groupBy`        | the grouping column, when the schema allows it               |
| `filters`        | column filters, keyed by column                              |
| `filterTree`     | the advanced AND/OR tree                                     |
| `pivot`          | the [pivot configuration](/adapttable/v2/pivot/)                        |
| `pivotCollapsed` | the folded pivot groups, by collapse key                     |
| `cursor`         | the opaque cursor, in cursor mode                            |
| `rejected`       | everything it refused, and why                               |

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
`maxLimit` defaults to that ceiling and `defaultLimit` to 25.

A filter is keyed by the parameter name after `f_`, so range bounds
(`f_budgetMin`, `f_hiredAtFrom`) pass only when `columns` names them in that
suffixed form.

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
Dropping a single condition out of an AND quietly *widens* the result set,
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
`ServerFilterValue` (one string, or several when the parameter repeats; a
checklist the table wrote arrives as one comma-separated string with each entry
percent-encoded), `pivotCollapsed`
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
the `formula=` codec (`serializeFormulaColumns`, `deserializeFormulaColumns`),
`isFilterGroup` for walking a tree, and the types those speak in —
`QueryCondition`, `QueryFilterGroup`, `SortLevel`, `SortDirection`,
`PivotConfig`, `PivotMeasure`, `PivotUrlState` and `FormulaColumnSpec`.

Every one of those names is also on a React entry, from the same source
module: the filter-tree and sort names on `@adapttable/core`, the pivot ones on
`@adapttable/core/pivot`, the formula ones on `@adapttable/core/formula`. The narrow entry leaves out the hooks, which is what lets it carry no
`"use client"` boundary and no React import at all — so it loads in a process
that has never installed React, and the encoding it reads is the same one the
table wrote.

Reach for it when you want the pieces; reach for `parseTableQuery` when you
want the allowlist, which is almost always.

Related: [data tiers](/adapttable/v2/data-tiers/) · [URL state](/adapttable/v2/url-state/) ·
[filtering](/adapttable/v2/filtering/) · [pivot tables](/adapttable/v2/pivot/)
