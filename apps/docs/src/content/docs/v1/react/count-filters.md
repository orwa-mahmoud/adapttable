---
title: "React table count filters — at least, at most (v1)"
description: "Count filters for React tables: narrow rows by a number with an
  operator — equals, greater, less or between — kept in the URL and sent to your
  server."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table count filters — at least, at
      most","item":"https://adapttable.orwamahmoud.com/v1/react/count-filters/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og.png
slug: v1/react/count-filters
---

Count filters narrow rows by a number with an operator — "projects ≥ 5",
"members between 2 and 8". `@adapttable/core` ships the helpers that map one
operator-driven filter onto the table's extra-filter bag (and therefore the
URL), read it back, strip half-filled filters before a request, and label
the chip. You draw the widget; the helpers keep its state consistent.

## Example

```tsx
import { useState } from "react";
import {
  type ActiveFilterChip,
  clearCountFilterExtra,
  COUNT_OPERATOR_SYMBOL,
  COUNT_OPERATORS,
  countFilterChipLabel,
  countFilterExtra,
  type CountFilterState,
  countFilterStateFromExtra,
  sanitizeCountFilterParams,
  useServerData,
} from "@adapttable/core";
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import { DataTable } from "@adapttable/mantine";

interface Team {
  id: string;
  name: string;
  projects: number;
}

const BUCKET = "projects";

function toNumber(raw: string): number | undefined {
  const n = Number(raw);
  return raw === "" || !Number.isFinite(n) ? undefined : n;
}

export function TeamsTable() {
  const [rows, setRows] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const source = useServerData<Team>({
    rows,
    total,
    loading,
    onQueryChange: async (query, { signal }) => {
      setLoading(true);
      try {
        // Half-filled count filters stay in the URL but never reach the API.
        const filters = sanitizeCountFilterParams(query.filters, [BUCKET]);
        const params = new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit),
          search: query.search,
        });
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined) params.set(key, String(value));
        }
        // e.g. /api/teams?page=1&limit=25&search=&projectsOp=gte&projectsValue=5
        const res = await fetch(`/api/teams?${params}`, { signal });
        const body = (await res.json()) as { items: Team[]; total: number };
        setRows(body.items);
        setTotal(body.total);
      } finally {
        setLoading(false);
      }
    },
  });

  const state = countFilterStateFromExtra(BUCKET, source.extra);
  const update = (next: CountFilterState) =>
    source.setExtras(
      next.op ? countFilterExtra(BUCKET, next) : clearCountFilterExtra(BUCKET),
    );

  const chipLabel = countFilterChipLabel("Projects", state);
  const extraChips: ActiveFilterChip[] = chipLabel
    ? [
        {
          key: BUCKET,
          label: chipLabel,
          onRemove: () => source.setExtras(clearCountFilterExtra(BUCKET)),
        },
      ]
    : [];

  return (
    <DataTable
      source={source}
      rowKey={(r) => r.id}
      columns={[
        { key: "name", sortable: true },
        { key: "projects", sortable: true, align: "end" },
      ]}
      extraChips={extraChips}
      filters={
        <fieldset>
          <legend>Projects</legend>
          <select
            aria-label="Operator"
            value={state.op ?? ""}
            onChange={(e) =>
              update({
                ...state,
                op: COUNT_OPERATORS.find((op) => op === e.currentTarget.value),
              })
            }
          >
            <option value="">Any</option>
            {COUNT_OPERATORS.map((op) => (
              <option key={op} value={op}>
                {COUNT_OPERATOR_SYMBOL[op]}
              </option>
            ))}
          </select>
          {state.op === "between" ? (
            <>
              <input
                type="number"
                aria-label="From"
                value={state.from ?? ""}
                onChange={(e) =>
                  update({ ...state, from: toNumber(e.currentTarget.value) })
                }
              />
              <input
                type="number"
                aria-label="To"
                value={state.to ?? ""}
                onChange={(e) =>
                  update({ ...state, to: toNumber(e.currentTarget.value) })
                }
              />
            </>
          ) : (
            <input
              type="number"
              aria-label="Value"
              value={state.value ?? ""}
              onChange={(e) =>
                update({ ...state, value: toNumber(e.currentTarget.value) })
              }
            />
          )}
        </fieldset>
      }
    />
  );
}
```

## How it works

* **One bucket, four keys.** A count filter is named by a *bucket*
  (`"projects"`) and stored as up to four extra-filter keys:
  `${bucket}Op`, `${bucket}Value`, `${bucket}From`, `${bucket}To`.
  Every extra-filter key is written to the URL under the `f_` prefix, so the
  example above produces `?f_projectsOp=gte&f_projectsValue=5`, or
  `?f_projectsOp=between&f_projectsFrom=2&f_projectsTo=8`. With
  `urlKey="left"` the params become `left.f_projectsOp`, ….
* **Writing.** `countFilterExtra(bucket, state)` returns all four keys:
  a unary operator sets `Value` and blanks `From`/`To`; `between` sets
  `From`/`To` and blanks `Value`. Pass the result to `source.setExtras` so
  the switch between operators lands in one commit and stale bounds leave
  the URL (an `undefined` value removes its param). Like every filter
  change, it resets the page to 1.
* **Reading.** `countFilterStateFromExtra(bucket, extra)` rebuilds the
  state from any bag. URL values arrive as strings, so it coerces numeric
  strings (`"5"` → `5`), drops non-finite numbers and non-numeric text, and
  drops an unknown operator. Registering the keys in `numberExtraKeys` is
  therefore optional.
* **Completeness.** `isCountFilterComplete(state)` is `true` when `op` is set
  and either `value` is a finite number (unary operators) or both `from` and
  `to` are (`between`).
* **Sanitizing for the server.** `sanitizeCountFilterParams(params, buckets)`
  returns a copy of `params` with every *incomplete* bucket's four keys
  removed and everything else untouched. A user who has picked an operator
  but not typed a value keeps that state in the URL, and the API never sees
  a half-built pair. It only removes keys: complete buckets keep their
  values as they were (strings when read from the URL).
* **Where the server reads it.** On `useServerData` (and the `<DataTable>`
  `onQueryChange` tier) the keys arrive in `query.filters`. On
  `useBackendData` the extra bag is merged into the params passed to your
  query hook, so `sanitizeParams` is the place to call
  `sanitizeCountFilterParams`. The server receives the bare keys
  (`projectsOp`, `projectsValue`, …), without the `f_` prefix.
* **Chips.** A bucket spans four keys, so it is shown through `extraChips`
  rather than `filterLabels`. `countFilterChipLabel(label, state)` returns
  `"Projects ≥ 5"` for unary operators, `"Projects: 2-8"` for `between`, and
  `undefined` while the state is incomplete. Remove the chip with
  `clearCountFilterExtra(bucket)`. Extra chips count toward the Filters
  badge, and the built-in clear-all (`source.clearExtras`) clears the bucket
  with every other filter.

### Client-side filtering

The helpers carry no row predicate. On the frontend tier, apply the state in
`useFrontendData`'s `filterFn`:

```tsx
import {
  type CountFilterState,
  countFilterStateFromExtra,
  isCountFilterComplete,
  useFrontendData,
} from "@adapttable/core";

interface Team {
  id: string;
  name: string;
  projects: number;
}

function matchesCount(n: number, s: CountFilterState): boolean {
  if (!isCountFilterComplete(s)) return true;
  const value = s.value ?? 0;
  switch (s.op) {
    case "eq":
      return n === value;
    case "gte":
      return n >= value;
    case "lte":
      return n <= value;
    case "gt":
      return n > value;
    case "lt":
      return n < value;
    default:
      return n >= (s.from ?? n) && n <= (s.to ?? n);
  }
}

export function useTeamsSource(teams: Team[]) {
  return useFrontendData({
    data: teams,
    filterFn: (row, extra) =>
      matchesCount(row.projects, countFilterStateFromExtra("projects", extra)),
  });
}
```

## API

| Export                                        | Signature                                                                                   | Description                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `COUNT_OPERATORS`                             | `readonly ["eq", "gte", "lte", "gt", "lt", "between"]`                                      | Every operator, in display order.                                           |
| `CountOperator`                               | `(typeof COUNT_OPERATORS)[number]`                                                          | One operator.                                                               |
| `CountFilterState`                            | `{ op?: CountOperator; value?: number; from?: number; to?: number }`                        | One bucket's state.                                                         |
| `COUNT_OPERATOR_SYMBOL`                       | `Record<CountOperator, string>`                                                             | `=`, `≥`, `≤`, `>`, `<`, `↔`.                                               |
| `countFilterExtra(bucket, state)`             | `(bucket: string, state: CountFilterState) => ExtraFilters`                                 | The four-key update for a bucket.                                           |
| `clearCountFilterExtra(bucket)`               | `(bucket: string) => ExtraFilters`                                                          | The four keys set to `undefined`.                                           |
| `countFilterStateFromExtra(bucket, extra)`    | `(bucket: string, extra: Readonly<Record<string, FilterValue>>) => CountFilterState`        | Rehydrate a bucket, coercing numeric strings.                               |
| `isCountFilterComplete(state)`                | `(state: CountFilterState) => boolean`                                                      | Whether the state is complete enough to query.                              |
| `sanitizeCountFilterParams(params, buckets)`  | `<P extends Record<string, unknown>>(params: P, buckets: readonly string[]) => P`           | Copy of `params` without incomplete buckets.                                |
| `countFilterChipLabel(label, state)`          | `(label: string, state: CountFilterState) => string \| undefined`                           | Compact chip text, or `undefined` when incomplete.                          |

Operators:

| Operator  | Symbol | Keys written          |
| --------- | ------ | --------------------- |
| `eq`      | `=`    | `Op`, `Value`         |
| `gte`     | `≥`    | `Op`, `Value`         |
| `lte`     | `≤`    | `Op`, `Value`         |
| `gt`      | `>`    | `Op`, `Value`         |
| `lt`      | `<`    | `Op`, `Value`         |
| `between` | `↔`    | `Op`, `From`, `To`    |

The comparison itself — including whether `between` bounds are inclusive —
is applied by your server or your `filterFn`.

## Notes

* All exports come from `@adapttable/core`; the adapters do not re-export
  them.
* `countFilterExtra` with no `op` still writes the unary `Value` key; to
  clear a bucket, use `clearCountFilterExtra` (as the example does when the
  operator is set back to "Any").
* Passing JSX as `filters` switches off the declarative filter derivations;
  the widget writes table state itself through the source. See
  [filtering](/v1/react/filtering/) for the built-in `numberRange` widget, which
  stores an inclusive `${key}Min`/`${key}Max` pair instead of an operator.

Related: [filtering](/v1/react/filtering/) · [data tiers](/v1/data-tiers/) ·
[URL state](/v1/react/url-state/) · [headless](/v1/react/headless/) ·
[API reference](/v1/react/api/)
