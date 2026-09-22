# React table aggregation — aggregate(), summaryRow & group totals

▶ **See it working:** [group totals, a footer grand total and pinned summaries in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/aggregation/) — filter the table and every total recomputes from the rows that remain. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Aggregation turns rows into numbers the table shows beside them: a grand
total in the footer, a subtotal on every group, a reader's own choice of
Sum or Average under a column. All of it is opt-in. A table with no
`summaryRow`, no aggregating column and no grouping feature computes
nothing and renders no summary chrome.

There are three places a total can live, and each has one owner:

| Where                               | Declared with                                   | Computed from                       |
| ----------------------------------- | ----------------------------------------------- | ----------------------------------- |
| The table footer                    | `summaryRow` on `DataTable`                     | the rows the table is showing       |
| Every group's header and footer     | a column's `aggregatable`, or `groupAggregates` | each group's leaf rows              |
| Sticky rows above or below the list | `pinnedSummaryRows({ top, bottom })`            | nothing — the objects are host data |

## Example

```tsx
import { type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { groupingPanel } from "@adapttable/mantine/grouping-panel";
import { aggregate } from "@adapttable/react";

interface Deal {
  id: string;
  owner: string;
  region: string;
  amount: number;
  closedOn: string; // ISO date
}

const deals: Deal[] = [
  {
    id: "1",
    owner: "Aisha",
    region: "EMEA",
    amount: 42_000,
    closedOn: "2026-03-14",
  },
  {
    id: "2",
    owner: "Jonas",
    region: "EMEA",
    amount: 18_500,
    closedOn: "2026-05-02",
  },
  {
    id: "3",
    owner: "Mei",
    region: "APAC",
    amount: 61_000,
    closedOn: "2026-04-21",
  },
  {
    id: "4",
    owner: "Tom",
    region: "APAC",
    amount: 9_800,
    closedOn: "2026-06-30",
  },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const columns: ColumnDef<Deal>[] = [
  { key: "owner", sortable: true },
  { key: "region", sortable: true },
  {
    key: "amount",
    accessor: (row) => money.format(row.amount),
    sortValue: (row) => row.amount,
    filter: "numberRange",
    // Group cells start as Sum; readers may switch to any listed operation.
    aggregatable: {
      default: "sum",
      operations: ["sum", "avg", "min", "max", "count"],
    },
    // A count stays a count; every other number reads as money.
    formatAggregate: (value, { aggregation }) =>
      typeof value === "number" && aggregation !== "count"
        ? money.format(value)
        : String(value ?? ""),
  },
  // `true` reads the declared filter type: a date column offers Min, Max, Count.
  {
    key: "closedOn",
    header: "Closed",
    filter: "dateRange",
    aggregatable: true,
  },
];

export function Deals() {
  return (
    <DataTable
      data={deals}
      columns={columns}
      rowKey={(row) => row.id}
      summaryRow={aggregate(
        { amount: "sum" },
        {
          columns,
          format: (value) =>
            typeof value === "number" ? money.format(value) : value,
        }
      )}
      features={[groupingPanel("region", { groupFooters: true })]}
    />
  );
}
```

Each region opens with a Sum of `amount` in the amount column and closes
with a footer carrying the same number. The table footer holds the grand
total. From the grouping panel a reader can switch the amount to Average,
add Closed with Min or Max, or remove either.

## How it works

- **One mapper shape.** `summaryRow` and `groupAggregates` both take
  `(rows) => cells`: rows in, a record of cells keyed by column out. A key
  the record leaves out renders an empty cell. Write that function by hand,
  or let `aggregate()` build it.
- **`summaryRow` totals what the table shows.** On a paged table that is
  the current page. With grouping active the table renders every filtered
  row, and the footer totals all of them. It renders as a footer row
  aligned under its columns; `renderFooter` on a column replaces one of
  its cells and receives the mapper's value as `value`.
- **Group cells come from the columns.** A column's `aggregatable.default`
  calculates on every group with no mapper at all, on `grouping()` and
  `groupingPanel()` alike. `groupAggregates` in the grouping extras adds
  host-computed cells; reader choices overlay both.
- **Each subtotal sits under its column.** Group headers and footers place
  an aggregate in the cell of the column it totals. On a mobile card the
  same numbers are captioned by their column instead. The footer summary
  closes the card list as one card of its own.
- **Missing is not zero.** `undefined` and `null` are skipped before an
  aggregator runs, so `count` counts values a column actually has. `sum` of
  nothing is `0`; `avg`, `min` and `max` of nothing are `undefined`.

## Build a mapper with `aggregate()`

`aggregate(spec, options?)` returns the mapper from a declaration. The
spec maps a column key to a built-in name — `sum`, `avg`, `count`, `min`,
`max` — or to your own function, which receives the values found for that
column and returns the cell:

```tsx
const distinct = (values: readonly unknown[]) => new Set(values).size;

const amountSum = aggregate({ amount: "sum" }, { columns });
const summary = aggregate({ owner: distinct, amount: "avg" }, { columns });

<DataTable
  data={deals}
  columns={columns}
  rowKey={(row) => row.id}
  summaryRow={amountSum}
  features={[
    groupingPanel("region", { groupAggregates: amountSum, groupFooters: true }),
  ]}
/>;
```

Pass `columns` and values resolve through each column's `sortValue`, the
way sorting and grouping resolve them, so a money-formatted cell still
aggregates on its number. Without `columns`, values come from the key's
data path. `format(value, key)` shapes the result when it is computed.

`@adapttable/react` exports `aggregate` typed for React cells, so it drops
into `summaryRow` directly. `@adapttable/core` exports the same helper with
a framework-neutral cell type, for code that does not render React.

A mapper built by `aggregate()` also tells the table what it computes. The
grouping panel lists those columns under their operation names. A
hand-written mapper names no operation: its cells are listed as **Set by
the app**, or as a **Custom** item a reader may replace when the column is
`aggregatable`.

`min` and `max` compare numbers, `Date` values and strict ISO date,
datetime and time strings (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ssZ`, `HH:mm`).
Locale-formatted dates are skipped. The winning original value is what the
cell receives: a number, a `Date`, or that ISO string.

## Let readers choose: `aggregatable`

A column's `aggregatable` says whether a reader may aggregate it and with
which operations. It takes `false` (the default), `true`, or an
`AggregatableConfig`:

- `true` offers what suits the column's **declared** filter or editor
  type: all five for `number` / `numberRange`, Min / Max / Count for
  `date` / `dateRange` / `datetime` / `time`, and Count otherwise. It never
  samples row values.
- `{ operations, default? }` lists exactly what to offer. `default` must be
  one of `operations`; without it the column is on offer but inactive until
  a reader adds it. An empty `operations` list offers nothing.
- `false` or omitted refuses reader changes. A `groupAggregates` cell or a
  server aggregate on that column still shows, read-only.

`groupable: false` is a separate switch: it stops a column being grouped
by. Grouping a column does not remove its aggregation offer.

### Formatting with `formatAggregate`

`formatAggregate(value, context)` on a column decides how its aggregate
reads. `context.columnKey` names the column and `context.aggregation` the
operation that produced the value, when the table knows it — the reader's
choice, a column default, an `aggregate()` declaration, or the operation a
server was asked for. A hand-written mapper declares nothing, so
`aggregation` is absent for its cells.

It runs where a group cell is drawn — header, footer and mobile group card
— so the value the table holds, compares and exports stays the one the
aggregate returned. `summaryRow` cells do not pass through it; format those
with `aggregate({ … }, { format })`.

With both set on a group mapper, `format` runs first and `formatAggregate`
receives its result. Leave group aggregates raw and let the column own
presentation, or write `formatAggregate` to pass non-numbers through.

### Custom operations

An operation can be your own `CustomAggregateOperation` — an `id`, a
`label`, and optionally `calculate` and `description`:

```tsx
const median = (values: readonly unknown[]) => {
  const sorted = values
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

{
  key: "amount",
  aggregatable: {
    default: "median",
    operations: [
      "sum",
      "avg",
      { id: "median", label: "Median", calculate: median },
      {
        id: "p90",
        label: "90th percentile",
        description: "The amount 90% of deals in the group stay under.",
      },
    ],
  },
}
```

- `id` is what state, the URL and a server request carry, so keep it
  stable. It cannot reuse a built-in name, `none` or `custom`; an invalid,
  duplicate or unknown entry is dropped with a development warning.
- `label` is what the reader sees. Built-in names are localized through
  `labels`; a custom label is yours to translate.
- `calculate` runs in the browser. Leave it out for an operation only the
  backend can answer — the table then offers it only when the source lists
  it in `supports.aggregateOperations`.
- `description` says what the operation means to anything reading the
  table rather than looking at it, such as an agent.

## Per-group aggregates and the grouping panel

`groupingPanel()` from `@adapttable/<kit>/grouping-panel` lists every
active aggregate as its own item — column name, operation selector, remove
— with **Add aggregation column**, and **Restore defaults** once the
reader has moved away from what the developer declared. Compose
`columnMenu()` as well and, while grouping is active, each column's menu
offers the same choice. Both surfaces read one `AggregationModel`, so a
column offers the same operations wherever a reader meets it. Every change
is announced through a polite live region.

Plain `grouping()` from `@adapttable/<kit>/grouping` has no panel, but it
still calculates column defaults, `groupAggregates` and choices restored
from the URL. Building, nesting and reordering group levels, group
footers, group sorting and paging are on the
[row grouping](./row-grouping.md) page.

### Reader choices: `GroupAggregateOverride`

A reader's choice for one column is a `GroupAggregateOverride`: an
operation id, or `"none"` (`AGGREGATE_SUPPRESSED`) when they removed an
aggregate the developer declared. `GroupAggregateOverrides` maps column
keys to those choices. They overlay the developer's setup and never
replace it — an untouched table has no overrides and stays at its
defaults, which still calculate.

`resolveEffectiveAggregation` from `@adapttable/core` decides what one
column shows, calculates and requests, in this order:

1. a valid reader override, or a permitted suppression (`override`,
   `suppressed`);
2. the column's `aggregatable.default`, when the source can execute it
   (`default`);
3. what the host's mapper or original server request already computes
   (`host`);
4. otherwise nothing (`inactive`).

A stale or disallowed id from any entry point — the panel, a URL, a saved
view — fails step 1 and falls through. `"none"` only removes a cell the
reader is allowed to control; a read-only host aggregate stays.

## Pinned totals

A total that is not computed from the visible rows — a target, a prior
period, a figure your backend returns — belongs in `pinnedSummaryRows`
from `@adapttable/<kit>/pinned-summary-rows`. Those rows stick above or
below the scroll window and never enter sort, filter, grouping, pagination
or selection. See [pinned summary rows](./pinned-summary-rows.md).

## Aggregates on the server

A server tier computes the aggregates itself. Declare the capability and
list the aggregates to request:

```tsx
import { DataTable, useQuerySource } from "@adapttable/mantine";
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

const source = useQuerySource<Deal, Params, Page>({
  usePaginatedQuery: useDealsQuery,
  selectPage: (page) => ({ rows: page.rows, total: page.total }),
  supports: {
    grouping: true,
    aggregates: true,
    aggregateOperations: ["sum", "avg", "min", "max", "count", "p90"],
  },
  aggregates: [{ key: "amount", fn: "sum" }],
  columns,
});

<DataTable
  source={source}
  columns={columns}
  rowKey={(row) => row.id}
  features={[groupingPanel("region")]}
/>;
```

- `query.aggregates` arrives as `[{ key, fn }]` and is sent only when the
  source declares `supports.aggregates`. With grouping active the server
  computes them per group and returns them on each `QueryGroupRow`'s
  `aggregates`; without grouping, over the whole result set.
- Reader choices and column defaults layer over the `aggregates` you
  declared before the request is sent. `columns` lets the source refuse an
  operation a column does not allow before it reaches the server.
- `supports.aggregateOperations` is the allowlist of ids the backend can
  compute. Without it, `aggregates: true` means the five built-ins; a local
  `calculate` is not proof the server knows an id.
- `formatAggregate` is told the operation the response on screen was
  computed with, not one still in flight. `useServerData` takes the same
  `supports`, `aggregates` and `columns`; a controlled `mode="server"` table
  echoes `responseKey` so the table can tie a response to its request. See
  [server tiers](./row-grouping.md#server-tiers).
- The table has no slot for a whole-set answer. Read it from your response
  and render it with `summaryRow` or `pinnedSummaryRows`.

## Options

`aggregate(spec, options?)` — `AggregateSpec` maps a column key to
`AggregateName | Aggregator`. `AggregateOptions<TRow>`:

| Option    | Type                                                                           | Default | Description                                                                           |
| --------- | ------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------- |
| `columns` | `readonly ColumnMetadata<TRow>[]`                                              | —       | Resolve values through each column's `sortValue`; without it, the key's data path.    |
| `format`  | `(value: DisplayValue \| undefined, key: string) => DisplayValue \| undefined` | —       | Shape the computed value. Runs when the value is computed.                            |
| `host`    | `FeatureHostState`                                                             | —       | The table the mapper runs in, for a call made outside one. The table binds it itself. |

Column fields:

| Field             | Type                                                    | Default | Description                                                                                    |
| ----------------- | ------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `aggregatable`    | `boolean \| AggregatableConfig`                         | `false` | What a reader may aggregate this column with. `true` reads the declared filter or editor type. |
| `formatAggregate` | `(value, context: AggregateFormatContext) => ReactNode` | —       | How a group aggregate of this column reads. Presentation only.                                 |
| `renderFooter`    | `(ctx: ColumnFooterContext<TRow>) => ReactNode`         | —       | Replace this column's `summaryRow` cell; `ctx.value` is the mapper's value.                    |

`AggregatableConfig`:

| Field        | Type                            | Default | Description                                                                        |
| ------------ | ------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `operations` | `readonly AggregateOperation[]` | —       | Built-in names and `{ id, label, calculate?, description? }` operations, in order. |
| `default`    | `string`                        | —       | The operation the column starts with; must be one of `operations`.                 |

Related props and options:

| Where                               | Field                          | Type                                                            | Description                                                  |
| ----------------------------------- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------ |
| `DataTable`                         | `summaryRow`                   | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | Footer cells for the rows the table shows.                   |
| `grouping` / `groupingPanel` extras | `groupAggregates`              | the same mapper shape                                           | Host-computed cells for each group.                          |
| `grouping` / `groupingPanel` extras | `groupFooters`                 | `boolean`                                                       | Close every group with a footer row carrying its aggregates. |
| `useQuerySource` / `useServerData`  | `aggregates`                   | `readonly QueryAggregate[]`                                     | Aggregates to request as `query.aggregates`.                 |
| `useQuerySource` / `useServerData`  | `supports.aggregates`          | `boolean`                                                       | The endpoint computes `query.aggregates`.                    |
| `useQuerySource` / `useServerData`  | `supports.aggregateOperations` | `readonly string[]`                                             | Operation ids the endpoint can compute.                      |

## URL state and saved views

Reader choices serialize as `groupAgg`, beside `groupBy`:
`?groupBy=region&groupAgg=amount:avg,closedOn:max`. `none` records a
removed developer default (`groupAgg=amount:none`); removing an aggregate
the reader added deletes its entry, and **Restore defaults** clears the
parameter. Column keys and operation ids are percent-encoded, so a custom
id containing a colon, comma or percent sign round-trips. With a `urlKey`
the parameter is prefixed like every other (`deals.groupAgg`). Saved Views
store the same state. `PARAM_GROUP_AGGREGATES` is the parameter name, and
`serializeGroupAggregateOverrides` / `parseGroupAggregateOverrides` are the
codec. See [URL state](./url-state.md) and [saved views](./saved-views.md).

`summaryRow`, `groupAggregates` and pinned summaries are code, not state:
nothing of them is written to the URL.

## Notes

- **RTL.** Aggregate cells follow their columns, so they mirror with the
  table. The grouping panel's operation labels and announcements ship in
  every bundled `@adapttable/i18n` locale. See [i18n and RTL](./i18n-rtl.md).
- **Keyboard and screen readers.** The panel's operation selector and
  remove button are kit-native controls, and every add, change, removal
  and restore is announced.
- **Agents.** `@adapttable/ai` changes the same reader choices through
  `view.setAggregations`, under the same rules. See
  [@adapttable/ai](./ai.md).
- **Pivot tables** aggregate across two axes with their own measures. See
  [pivot](./pivot.md).

Related: [row grouping](./row-grouping.md) ·
[pinned summary rows](./pinned-summary-rows.md) ·
[server queries](./server-queries.md) · [columns](./columns.md)
