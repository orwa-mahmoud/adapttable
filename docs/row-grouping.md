# React table row grouping — nested groups, aggregates & expand/collapse

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`groupBy="role"` + `groupAggregates`); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [collapse groups and read per-group subtotals in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/grouping/) — a real table you can click, not a recording.

Each subtotal renders in its own column's cell, so it sits under the column it
totals — on a mobile card, where there are no columns to align to, the same
numbers appear captioned by their column instead. A custom renderer can place
them the same way with `groupRowLayout` and `groupAggregateEntries`.

Group rows with `groupBy` — one column key, or an ordered list to nest — and
add optional per-group subtotals via `groupAggregates`, the **same mapper
signature as `summaryRow`**. Omit `groupBy` and the table never inserts group
header rows (package DNA: opt-in).

## Paging groups, and paging inside one

A table grouped by customer can have ten thousand groups. `groupPageSize` shows
a screenful and offers the rest; `groupRowPageSize` does the same for the rows
inside each group:

```tsx
<DataTable
  data={ORDERS}
  columns={columns}
  rowKey={rowKey}
  groupBy="customer"
  groupPageSize={25}
  groupRowPageSize={10}
/>
```

Each limit adds one row — "Show 42 more groups", "Show 8 more in this group" —
that reveals the next page when clicked. Only the **top level** pages: a nested
level is already inside a group the reader opened, and hiding part of what they
just opened would be a second "more" to hunt for.

On a **server tier** the rest of a group is not in the browser yet, so
`onGroupLoadMore(groupKey)` fires with the group that needs filling. Fetch it,
hand back a longer `rows` for that group, and the next render shows them; the
table reveals whatever it already holds either way. Both labels are localizable
(`labels.moreGroups`, `labels.moreRowsInGroup`) in all seventeen locales, and the
rows carry `group-more-row` / `group-more-cell` / `group-more` parts (with
`groupMoreRow` / `groupMoreCell` class hooks in `@adapttable/unstyled`).

## Grouping on the server

A backend that can group is usually the only thing that can: it has the whole
dataset, and the browser has a page of it. Declare the capability and the table
sends the grouping keys with every query:

```tsx
const source = useQuerySource<Person, Params, Page>({
  queryKey: ["people"],
  queryFn: fetchPeople,
  select: (page) => ({
    rows: page.rows,
    total: page.total,
    groups: page.groups,
  }),
  supports: { grouping: true, aggregates: true },
  aggregates: [{ key: "budget", fn: "sum" }],
});

<DataTable source={source} columns={columns} rowKey={rowKey} groupBy="team" />;
```

`query.groupBy` arrives as an **array**, outermost key first — one entry for a
flat grouping, more for nested — and `query.aggregates` as
`[{ key, fn }]`. Neither is sent unless the source declared the matching
capability, so an endpoint that predates this never sees a field it does not
understand.

### The response shape

```ts
interface QueryGroupRow<TRow> {
  value: unknown; // the group's value, shown as its label
  count: number; // leaves beneath it, across the dataset
  aggregates?: Record<string, unknown>; // by column key
  groups?: QueryGroupRow<TRow>[]; // nested levels, when asked for
  rows?: TRow[]; // leaves, when the server includes them
}
```

Return them as `groups` on the source and the table renders them exactly as it
renders local groups — same headers, same collapsing, same footers, same
selection. **The counts and aggregates are the server's**: a group of 4,000
whose response carried 20 rows says 4,000, because counting what arrived would
be a number the user can see is wrong.

A reference endpoint, grouping one level and returning the first page of each
group's rows:

```ts
app.get("/people", async (req, res) => {
  const groupBy = [req.query.groupBy ?? []].flat(); // e.g. ["team"]
  if (groupBy.length === 0) return res.json(await plainPage(req));

  const key = groupBy[0];
  const rows = await db
    .select(key, db.raw("count(*) as count"), db.raw("sum(budget) as budget"))
    .from("people")
    .groupBy(key)
    .orderBy("count", "desc");

  res.json({
    total: rows.reduce((sum, row) => sum + Number(row.count), 0),
    groups: await Promise.all(
      rows.map(async (row) => ({
        value: row[key],
        count: Number(row.count),
        aggregates: { budget: Number(row.budget) },
        rows: await db
          .select("*")
          .from("people")
          .where(key, row[key])
          .limit(20),
      }))
    ),
  });
});
```

Leave `rows` out to send counts only — the headers render with their counts and
nothing beneath them, which is the right answer for a table of a million rows
in a hundred groups. Fetch a group's rows when it opens by reacting to
`onCollapsedGroupIdsChange`: it tells you exactly which group the user just
expanded, and the next response fills it in.

**Without the capability**, a server tier that is asked to group says so in
development — "grouping is only supported on the frontend data tier" — and
renders ungrouped rather than grouping the page it happens to hold, which would
be one page's worth of groups presented as the whole set.

## Controlling what is open

Groups start expanded and collapse on their own. To hold that state yourself,
pass the pair:

```tsx
const [closed, setClosed] = useState<string[]>([]);

<DataTable
  data={PEOPLE}
  columns={columns}
  rowKey={(r) => r.id}
  groupBy={["team", "status"]}
  collapsedGroupIds={closed}
  onCollapsedGroupIdsChange={setClosed}
/>;
```

The set names what is **closed**, because groups default to open — so an empty
set is a fully expanded table, and the state stays small no matter how many
groups there are. Each key carries the group's whole path, so nesting needs no
extra bookkeeping.

**In the URL**, with `useGroupCollapseUrlState`:

```tsx
const groups = useGroupCollapseUrlState({ urlKey: "people" });

<DataTable {...groups} groupBy="team" columns={columns} rowKey={rowKey} />;
```

A link then carries which groups were folded — part of what someone means when
they send one. Keys are percent-encoded, so a label containing a comma cannot
split the list, and the parameter disappears when everything is open again.

**Whole-tree actions** live on the table's grouping bundle, for a host that
wants its own buttons: `expandAll()`, `collapseAll()`, and
`collapseToDepth(depth)` — depth `0` leaves only the outermost headers showing,
`1` opens the first level inside them.

## Ordering and filtering groups

`groupSort` orders the groups inside their parent, and `groupFilter` decides
which of them are worth showing:

```tsx
<DataTable
  data={SALES}
  columns={columns}
  rowKey={(r) => r.id}
  groupBy="region"
  groupAggregates={(rows) => ({ amount: sum(rows) })}
  // Biggest region first — the same rows the aggregate is computed from.
  groupSort={(a, b) => sum(b.leafRows) - sum(a.leafRows)}
  // And only the regions worth a line.
  groupFilter={(group) => sum(group.leafRows) >= 10_000}
/>
```

`groupSort` also takes `"label"`, `"label-desc"`, `"count"` and `"count-desc"`.
**To sort by an aggregate, compare the leaves** — an aggregate is a function of
its rows, and comparing the rendered aggregate cell would mean comparing
ReactNodes, which is not an ordering. Both props apply at every level of a
nested group.

### The order things happen in

1. **Row filters and search** run on the source, exactly as they do without
   grouping. Grouping never sees a row a filter removed.
2. **Grouping** partitions what survived, one level per `groupBy` key.
3. **`groupFilter`** drops whole groups — a dropped group takes its leaves with
   it, so the counts and totals that remain describe what is on screen.
4. **`groupSort`** orders the groups within each parent. Without it they keep
   the order the source's own sort produced.
5. **Leaf order inside a group is the source's**, always. Sorting a column sorts
   the rows within each group; it does not reorder the groups themselves —
   that is `groupSort`'s job, and keeping them separate is what lets you sort
   rows by name inside groups ordered by total.

Collapsed state is keyed by the group's path, so reordering or filtering groups
never opens or closes anything by accident.

## Footers and grand totals

`groupFooters` closes every group with a row carrying the same aggregates its
header carries:

```tsx
<DataTable
  data={PEOPLE}
  columns={columns}
  rowKey={(r) => r.id}
  groupBy="team"
  groupAggregates={(rows) => ({ budget: sum(rows) })}
  groupFooters
  summaryRow={(rows) => ({ budget: sum(rows) })}
/>
```

The totals then read at the bottom of a group as well as the top — which is
where the reader of a long group is by the time they want them. A footer shows
no chevron and no checkbox: the header already owns both. Nested groups each get
their own, innermost first, and a **collapsed** group shows none at all — its
header is already carrying the numbers, with nothing between them.

`summaryRow` is the table's grand total, and under grouping it totals the whole
filtered set rather than a page of it. The two compose: per-group footers, one
grand total.

On mobile the footer is a card of its own after the group's cards, captioned the
same way. Exports are unaffected — a footer is chrome, not a row, so a CSV
carries the data and nothing else.

Each footer is captioned through `labels.groupTotal`, translated in all
seventeen locales, and carries `data-adapttable-part="group-footer-row"` /
`group-footer-cell` (plus the `groupFooterRow` / `groupFooterCell` class hooks
in `@adapttable/unstyled`).

## Nested groups

`groupBy` also takes an ordered list, and each key nests inside the one before
it:

```tsx
<DataTable
  data={PEOPLE}
  columns={columns}
  rowKey={(r) => r.id}
  groupBy={["team", "status"]}
/>
```

> Core (12)
> &nbsp;&nbsp;active (7)
> &nbsp;&nbsp;blocked (5)
> Platform (9)
> &nbsp;&nbsp;active (9)

Every header describes its **whole subtree**: the count beside "Core" is all
twelve of its people, and its `groupAggregates` cells total the same twelve.
Deeper levels indent by logical padding, so nesting mirrors in Arabic and
Hebrew without a second rule.

Each node collapses on its own — "Core > blocked" and "Platform > blocked" are
different groups with different keys, so closing one leaves the other open, and
closing a parent hides its whole subtree in one step. Collapsed keys serialize
exactly as they did with one level.

In the URL and in saved views the keys travel as one comma-separated value —
`?groupBy=team,status` — so a link built before nesting existed still works,
and `onGroupByChange` reports the keys as a list.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Aisha", team: "Core", budget: 42_000 },
  { id: "2", name: "Jonas", team: "Platform", budget: 38_000 },
  { id: "3", name: "Mei", team: "Core", budget: 51_000 },
];

export function People() {
  return (
    <DataTable
      data={PEOPLE}
      columns={[
        { key: "name", sortable: true },
        { key: "team", sortable: true },
        {
          key: "budget",
          accessor: (r) => `$${r.budget.toLocaleString()}`,
          sortValue: (r) => r.budget,
        },
      ]}
      rowKey={(r) => r.id}
      groupBy="team"
      groupAggregates={(rows) => ({
        budget: (
          <b>${rows.reduce((sum, r) => sum + r.budget, 0).toLocaleString()}</b>
        ),
      })}
    />
  );
}
```

## How it works

- **Opt-in.** Pass `groupBy` (a column key) or set `source.groupBy` via
  `useFrontendData` / URL state — without it, grouping stays fully dormant.
- **One key or a list.** `groupBy="team"` groups one level;
  `groupBy={["team", "status"]}` nests each key inside the one before it, to
  any depth. There is no drag-to-group panel — the keys come from your code or
  the URL.
- **Frontend tier only.** Grouping needs the full filtered row set in memory
  (`allFilteredRows`). Server-paginated sources log a dev-mode warning and
  ignore grouping — see [Data tiers](./data-tiers.md).
- **Shared mapper.** `groupAggregates(rows)` uses the same
  `(rows) => Partial<Record<string, ReactNode>>` shape as `summaryRow`; reuse
  one function for both if the math is identical — or build both with
  `aggregate()` (below).
- **Expand / collapse.** Groups start expanded. Collapse state is ephemeral
  (not URL-synced). `groupBy` itself serializes to the URL like sort and
  filters.
- **Selection.** When row checkboxes are enabled, each group header exposes a
  tri-state checkbox over its leaf rows.

## Aggregate without writing the maths

The mapper above is a function you write. When the sums are ordinary, declare
them instead and `aggregate()` returns that same mapper:

```tsx
import { aggregate } from "@adapttable/core";

<DataTable
  groupBy="role"
  groupAggregates={aggregate({ budget: "sum", team: "count" }, { columns })}
  summaryRow={aggregate({ budget: "sum" }, { columns })}
  columns={columns}
  // …
/>;
```

Built in: `sum`, `avg`, `count`, `min`, `max`. Pass your own function for
anything else — it receives the values found for that column and returns the
cell:

```tsx
const distinct = (values) => new Set(values).size;
groupAggregates={aggregate({ team: distinct })}
```

Passing `columns` lets values resolve through a column's `sortValue`, exactly
as sorting and grouping do, so a formatted cell still aggregates on its
underlying number. Add `format` to shape the result for display:

```tsx
aggregate(
  { budget: "sum" },
  { columns, format: (v) => (typeof v === "number" ? money.format(v) : v) }
);
```

Two behaviours worth knowing, because they are choices rather than accidents:
a missing value is skipped rather than counted as zero, so `count` reports the
values a column actually has; and while `sum` of nothing is `0`, `avg`, `min`
and `max` of nothing are `undefined` — an average of no numbers is
unanswerable, not zero.

## Options

| Prop / field                | Type                                                            | Default | Description                                                                                 |
| --------------------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `groupBy`                   | `string \| null`                                                | —       | Column key to group by; its presence arms grouping (still requires a frontend data source). |
| `onGroupByChange`           | `(groupBy: string \| null) => void`                             | —       | Controlled change channel; falls back to `source.setGroupBy`.                               |
| `groupAggregates`           | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —       | Per-group cells — **same signature as `summaryRow`**. Omit for headers without subtotals.   |
| `collapsedGroupIds`         | `readonly string[]`                                             | —       | Controlled collapsed group keys (ephemeral — not URL-synced).                               |
| `onCollapsedGroupIdsChange` | `(ids: string[]) => void`                                       | —       | Controlled collapse channel; uncontrolled mode uses internal state.                         |
| `labels`                    | `TableLabels`                                                   | English | Override `expandGroup`, `collapseGroup`, and `groupCount` for header controls.              |

## Grouped tables are a full-set view

With `groupBy` active the table renders **every filtered row** (grouped),
and the chrome agrees with the screen: the footer count describes the
rendered set, header select-all covers all rendered rows, page-scope CSV
export contains exactly what you see, and the rows-per-page control hides
(page size has no effect). Ungroup to return to normal pagination.

## Headless grouping

The grouping model is exported so custom tables can render the same flat
structure the adapters do, at one level or nested:

| Export                                         | Purpose                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `buildGroupedFlatModel` / `GroupedFlatEntry`   | Partition leaf rows into a flat list — group header, then its leaves (omitted when collapsed). |
| `groupValueKey`                                | Stable, type-tagged string key for a group bucket (`5` and `"5"` never share one).             |
| `useGroupCollapse` / `GroupCollapseState`      | Ephemeral collapse state — groups default to expanded; not URL-synced.                         |
| `GroupAggregatesFn`                            | The `(rows) => Partial<Record<string, ReactNode>>` mapper shared with `summaryRow`.            |
| `formatGroupLabel`                             | The header label for a bucket value (localized blank-value fallback included).                 |
| `groupSelectionState` / `HeaderSelectionState` | Tri-state for a group checkbox over its leaf ids — the same enum the header select-all uses.   |
| `windowGroupedEntries`                         | Slice a flat grouped model to a virtual window (see [Virtualization](./virtualization.md)).    |

## Notes

- Bucketing uses the column's `sortValue` when present, otherwise a path lookup
  on the column key — never the JSX `accessor`.
- Works on desktop rows and mobile cards, LTR and RTL, with and without
  `virtualize` (virtual windows count collapsed groups as one row).
- Out of scope (by design): a drag-to-group panel and Excel-style aggregation
  pickers. Pivoting is a separate model — see [Pivot](./pivot.md).
- Ant Design maps group headers onto its high-level `Table` via custom row
  rendering; every other kit renders native group header rows/cards.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/) —
rows are grouped by team with a budget subtotal per group.
