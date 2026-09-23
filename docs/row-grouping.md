# React table row grouping — interactive panel, nested groups & aggregates

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — the starter is grouped by role with salary subtotals (`groupingPanel("role", { groupAggregates })`); drag another header onto the panel, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [collapse groups and override aggregations in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/grouping/) — a real table you can click, not a recording. Independent pinned totals and the footer grand total live on the [aggregation page](https://orwa-mahmoud.github.io/adapttable/demo/mantine/aggregation/).

Each subtotal renders in its own column's cell, so it sits under the column it
totals — on a mobile card, where there are no columns to align to, the same
numbers appear captioned by their column instead. A custom renderer can place
them the same way with `groupRowLayout` and `groupAggregateEntries`.

Compose `groupingPanel` from `@adapttable/<kit>/grouping-panel`. It owns both
the grouped-row headers and the interactive panel, so use it instead of plain
`grouping()` when users should be able to configure grouping:

```tsx
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

<DataTable features={[groupingPanel()]} … />;
<DataTable
  features={[
    groupingPanel(["team", "status"], {
      groupAggregates: (rows) => ({ budget: sum(rows) }),
    }),
  ]}
  …
/>;
```

The first argument is an initial column key or ordered list; omit it to start
with an empty strip. The second argument accepts the ordinary grouping extras,
including `groupAggregates`, whose mapper has the **same signature as
`summaryRow`**. Omit the factory and the table mounts neither grouping headers
nor panel chrome. Plain `grouping("team")` from `@adapttable/<kit>/grouping` is
the no-panel path for a host that deliberately fixes grouping in code, and the
only grouping entry `@adapttable/bootstrap` ships. See
[feature composition](./features.md).

## The grouping panel

On desktop, the feature adds a dedicated strip above the table. Drag any data
header into it to group — set `groupable: false` on a column and its header
offers no drag and the panel does not list it, the same opt-out shape as
`sortable` — drag the chips to change nesting order — onto another
chip to take its place, or onto the caret between two to land there — or drag a
chip to the remove target to ungroup it. A chip's focusable move control also
supports Arrow Up/Down and logical Arrow Left/Right; the latter reverse in RTL
so movement follows the visible order. Its remove button is the keyboard
dismiss route. Every add, move, removal, and aggregation change is announced
through a polite live region. The captions and announcement templates ship in
every bundled `@adapttable/i18n` locale.

A column decides what it buckets rows by. Without help a group is one distinct
sort value, which is right for a team or a status and wrong for anything
continuous — group by a timestamp and every row becomes its own group, headed
by the raw number. `groupValue` returns the bucket instead, and it is also the
group's caption:

```tsx
{
  key: "start",
  sortValue: (row) => row.start.getTime(),
  groupValue: (row) => monthOf(row.start),
}
```

Every layout also provides **Add grouping column**. Beside the grouping chips,
every active aggregate is its own item — column name, operation selector, and
remove — plus **Add aggregation column** and **Restore defaults** when the
developer sent defaults the reader has changed. Mobile uses these kit-native
controls rather than header drag-and-drop.

A column's `Aggregatable` declaration (`aggregatable`) decides what a reader
may add — `AggregatableConfig` with `default` and `operations` of
`AggregateOperation` values (a built-in name or a `CustomAggregateOperation`).
`resolveAggregatable` / `resolveAggregatableColumns` validate that offer;
`impliedOperations` is what `true` reads from the declared filter or editor
type. Developer defaults (`aggregatable.default`, a declared
`GroupAggregatesMapper` via `aggregate()`, or the original server
`aggregates` query) appear immediately. Removing a developer default records
an explicit suppression (`AGGREGATE_SUPPRESSED` / `"none"` in `groupAgg`);
`restoreAggregationDefaults` puts the original developer configuration back,
not the latest server response. The panel and column menu both read
`aggregationModel`. Display, local calculation and the server request share
`resolveEffectiveAggregation` (`EffectiveAggregationInput` /
`EffectiveAggregationKind`): a valid reader override or permitted
suppression, then a valid executable column default, then the original host
mapper or request. Defaults are not written into reader state — an untouched
table stays at defaults, and those defaults actually calculate and request.

```tsx
{
  key: "budget",
  aggregatable: {
    default: "sum",
    operations: ["sum", "avg", "min", "max", "count"],
  },
}
{
  key: "start",
  aggregatable: { operations: ["min", "max", "count"] },
}
{
  key: "score",
  aggregatable: {
    default: "median",
    operations: [
      "sum",
      "avg",
      { id: "median", label: "Median", calculate: median },
    ],
  },
}
```

`aggregatable: true` offers the operations that suit the column's **declared**
filter or editor type — never a sampled row, and never TypeScript's erased
value type. Numeric for `number` / `numberRange`; min/max/count for
`date` / `dateRange` / `datetime` / `time`; Count otherwise. A numeric column
without that metadata can still list explicit `operations`. `false` or omitted
refuses reader changes; a host mapper or server aggregate on that column still
shows — read-only when the reader cannot replace it, or as a Custom /
application-calculated item they may replace or suppress when they can.
Empty `operations` offers nothing. A custom `{ id, label, calculate }` is
addressed by `id`; omit `calculate` for an operation only the backend can
answer, and list that id on `supports.aggregateOperations`.

`min` and `max` compare numbers, `Date` values and strict ISO date / datetime /
time strings (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ssZ`,
`HH:mm`). Locale-dependent forms are skipped, not guessed. The winning
original value is what `formatAggregate` receives — a number, a `Date`, or
that ISO string — so a date column can format it without a numeric
`sortValue`. `count` still counts present values. An explicit `sortValue`
is respected first.

Grouping a column does not remove its aggregation offer. A grouped column
with Count (or any allowed operation) stays selectable; the group's row
count is not a substitute — missing values make those different.

`groupAgg` encodes both the column key and the operation id, so custom ids
with colons, commas, percents or Unicode round-trip. A built-in operation
encodes as `budget:sum`.

A computed aggregate is a number, and a number under a money column should
read as money. `formatAggregate` on the column says how one reads, and is
given the operation that produced it where the table knows it — the reader's
own choice, or the one a server was asked for — so a count reads as a count
under the same column:

```tsx
{
  key: "budget",
  accessor: (row) => money.format(row.budget),
  sortValue: (row) => row.budget,
  formatAggregate: (value, { aggregation }) =>
    typeof value !== "number" || aggregation === "count"
      ? value
      : money.format(value),
}
```

It runs where the cell is drawn — group header, group footer and mobile group
card alike — so the value the table holds, exports and compares stays the one
the aggregate returned.

**It composes with `aggregate({ format })`, and nothing stops it running
twice.** The two happen at different moments: `format` runs when the value is
computed, `formatAggregate` when the cell is drawn. Set both and the column's
formatter is handed whatever the mapper produced — a string, a node — and will
format that again unless it is written to pass non-numbers through, as the
example above does. The simplest arrangement is to leave group aggregates raw
and let the column own how they read; `format` still belongs on a mapper used
for `summaryRow`, which `formatAggregate` does not touch.

### Server tiers

On a server tier the operation is the one the request carried, and it is
published as of the response being drawn — so a column is told what the
numbers on screen were computed with, not what a request still in flight asks
for. Each request's operations are held against its own key, and only a
response that can be tied back to one of those requests moves what the table
publishes. A request that cannot be tied to one is reported as unknown:
`formatAggregate` is passed no operation, rather than one that may be wrong.

`useQuerySource` gets that association from the query itself: `dataUpdatedAt`
says whether the query showing these pages has an answer of its own, read
against the request it belongs to — two cached results can carry the same
stamp, so a stamp alone is not identity.

`useServerData` cannot see any of it. A controlled tier's rows simply change,
sometimes as the very array that was already there, and a cancelled request
looks exactly like an answered one from the outside. So `onQueryChange` hands
the handler an `info.key` naming the request, and `responseKey` is where the
answer's key comes back:

```tsx
const [rows, setRows] = useState<Person[]>([]);
const [answered, setAnswered] = useState<string>();

<DataTable
  mode="server"
  data={rows}
  total={total}
  loading={loading}
  responseKey={answered}
  onQueryChange={async (query, { signal, key }) => {
    const res = await fetch(`/api/people?${toParams(query)}`, { signal });
    const page = await res.json();
    setRows(page.items);
    setAnswered(key);
  }}
/>;
```

**A controlled tier needs `responseKey` to be accurate about this.** Without
it, rows retained through an in-flight or failed request keep the operations
they came with, but once a request simply stops the rows on screen are
described as unknown — a stopped request is what an abort looks like too, and
the table will not name an operation it cannot place. The same holds for a
hand-rolled `TableSource`: publish `groupAggregations` yourself, or leave it
unset and the table falls back to the reader's own choices. An aggregate
function only the server understands is reported as unknown rather than
guessed at.

Compose `columnMenu()` too and each column row gains **Group by…** or
**Ungroup…**. While grouping is active, an ungrouped column also offers the
same aggregation choice. Both routes write the same `groupBy` / `groupAgg`
state, so the panel, menu, URL, and Saved Views cannot disagree.

## Paging groups, and paging inside one

A table grouped by customer can have ten thousand groups. `groupPageSize` shows
a screenful and offers the rest; `groupRowPageSize` does the same for the rows
inside each group:

```tsx
import { DataTable } from "@adapttable/mantine";
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

<DataTable
  data={ORDERS}
  columns={columns}
  rowKey={rowKey}
  features={[
    groupingPanel("customer", {
      groupPageSize: 25,
      groupRowPageSize: 10,
    }),
  ]}
/>;
```

Each limit adds one row — "Show 42 more groups", "Show 8 more in this group" —
that reveals the next page when clicked. Only the **top level** pages: a nested
level is already inside a group the reader opened, and hiding part of what they
just opened would be a second "more" to hunt for.

On a **server tier** the rest of a group is not in the browser yet, so
`onGroupLoadMore(groupKey)` fires with the group that needs filling. Fetch it,
hand back a longer `rows` for that group, and the next render shows them; the
table reveals whatever it already holds either way. Both labels are localizable
(`labels.moreGroups`, `labels.moreRowsInGroup`) in every bundled locale, and the
rows carry `group-more-row` / `group-more-cell` / `group-more` parts (with
`groupMoreRow` / `groupMoreCell` class hooks in `@adapttable/unstyled`).

## Grouping on the server

A backend that can group is usually the only thing that can: it has the whole
dataset, and the browser has a page of it. Declare the capability and the table
sends the grouping keys with every query:

```tsx
import { DataTable, useQuerySource } from "@adapttable/mantine";
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

const source = useQuerySource<Person, Params, Page>({
  usePaginatedQuery: usePeopleQuery,
  selectPage: (page) => ({ rows: page.rows, total: page.total }),
  supports: { grouping: true, aggregates: true },
  aggregates: [{ key: "budget", fn: "sum" }],
});

<DataTable
  source={source}
  columns={columns}
  rowKey={rowKey}
  features={[groupingPanel("team")]}
/>;
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

They reach the table through the `groups` field of a `TableSource`
(`readonly groups?: readonly QueryGroupRow<TRow>[]`). `useQuerySource` and
`useServerData` send the grouping request and leave `groups` unset, so a
server-grouped tier is a `TableSource` that sets `groups` from the response.
The table renders them exactly as it renders local groups — same headers, same collapsing, same footers, same
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
the status bar and in development, and renders ungrouped rather than grouping
the page it happens to hold, which would be one page's worth of groups
presented as the whole set.

## Controlling what is open

Groups start expanded and collapse on their own. To hold that state yourself,
pass the pair:

```tsx
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

const [closed, setClosed] = useState<string[]>([]);

<DataTable
  data={PEOPLE}
  columns={columns}
  rowKey={(r) => r.id}
  features={[
    groupingPanel(["team", "status"], {
      collapsedGroupIds: closed,
      onCollapsedGroupIdsChange: setClosed,
    }),
  ]}
/>;
```

The set names what is **closed**, because groups default to open — so an empty
set is a fully expanded table, and the state stays small no matter how many
groups there are. Each key carries the group's whole path, so nesting needs no
extra bookkeeping.

**In the URL**, with `useGroupCollapseUrlState`:

```tsx
import { groupingPanel } from "@adapttable/mantine/grouping-panel";
import { useGroupCollapseUrlState } from "@adapttable/react";

const groups = useGroupCollapseUrlState({ urlKey: "people" });

<DataTable
  {...groups}
  features={[groupingPanel("team")]}
  columns={columns}
  rowKey={rowKey}
/>;
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
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

<DataTable
  data={SALES}
  columns={columns}
  rowKey={(r) => r.id}
  features={[
    groupingPanel("region", {
      groupAggregates: (rows) => ({ amount: sum(rows) }),
      // Biggest region first — the same rows the aggregate is computed from.
      groupSort: (a, b) => sum(b.leafRows) - sum(a.leafRows),
      // And only the regions worth a line.
      groupFilter: (group) => sum(group.leafRows) >= 10_000,
    }),
  ]}
/>;
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
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

<DataTable
  data={PEOPLE}
  columns={columns}
  rowKey={(r) => r.id}
  features={[
    groupingPanel("team", {
      groupAggregates: (rows) => ({ budget: sum(rows) }),
      groupFooters: true,
    }),
  ]}
  summaryRow={(rows) => ({ budget: sum(rows) })}
/>;
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

Each footer is captioned through `labels.groupTotal`, translated in every
bundled locale, and carries `data-adapttable-part="group-footer-row"` /
`group-footer-cell` (plus the `groupFooterRow` / `groupFooterCell` class hooks
in `@adapttable/unstyled`).

## Nested groups

`groupingPanel` also takes an ordered list, and each key nests inside the one
before it:

```tsx
features={[groupingPanel(["team", "status"])]}
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

In the URL and in Saved Views the keys travel as one comma-separated value —
`?groupBy=team,status`. Session aggregation overrides travel beside them as
`groupAgg`, for example `groupAgg=budget:sum,headcount:count`. A single key
(`?groupBy=team`) and a list parse the same way, and `onGroupByChange` reports
the keys as a list.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

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
      features={[
        groupingPanel("team", {
          groupAggregates: (rows) => ({
            budget: (
              <b>
                ${rows.reduce((sum, r) => sum + r.budget, 0).toLocaleString()}
              </b>
            ),
          }),
        }),
      ]}
    />
  );
}
```

## How it works

- **Opt-in.** Compose `groupingPanel()` for user-configurable grouping. The
  source and URL state carry the resolved grouping value, but neither imports
  or mounts the feature.
- **One key or a list.** `groupingPanel("team")` starts with one level;
  `groupingPanel(["team", "status"])` starts nested, and users can add,
  remove, or reorder those keys from the panel.
- **Somewhere that can group.** Either the full filtered set is in memory
  (`allFilteredRows`) or the server returns group rows. A source that can do
  neither — `capabilities.grouping: false`, declared or inferred — renders
  ungrouped, says so in the status bar and warns in development. See
  [source capabilities](./data-tiers.md#what-a-source-can-do--capabilities).
- **Shared mapper.** `groupAggregates(rows)` uses the same `(rows) => cells`
  shape as `summaryRow` (`SummaryRowFn` on `@adapttable/react`); reuse
  one function for both if the math is identical — or build both with
  `aggregate()` (below).
- **Session aggregation overrides.** Each active column has its own operation.
  Reader choices overlay the developer's `aggregatable.default`, declared
  `groupAggregates`, or original `query.aggregates`. Removing a developer
  default writes `none`; **Restore defaults** clears the override map. The
  choices serialize as `groupAgg`, including host-defined ids.
- **Expand / collapse.** Groups start expanded. Collapse state can be paired
  with `useGroupCollapseUrlState`; `groupBy` and `groupAgg` use the table's
  ordinary URL state.
- **Selection.** When row checkboxes are enabled, each group header exposes a
  tri-state checkbox over its leaf rows.

## Aggregate without writing the maths

Every aggregation option — `aggregate()`, `aggregatable` columns, custom
operations and server aggregates — is on the [aggregation](./aggregation.md) page.

The mapper above is a function you write. When the sums are ordinary, declare
them instead and `aggregate()` returns that same mapper:

```tsx
import { aggregate } from "@adapttable/core";
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

<DataTable
  features={[
    groupingPanel("role", {
      groupAggregates: aggregate({ budget: "sum", team: "count" }, { columns }),
    }),
  ]}
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
groupingPanel("team", { groupAggregates: aggregate({ team: distinct }) });
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

## Reorder inside a group or move between groups

Compose `groupingPanel` and the kit's `rowReorder` feature together. A reorder
that stays inside one leaf group calls the ordinary handler with positions
scoped to that group. Crossing a boundary — by drag, arrows, mobile controls,
or **Move to group…** — calls
`onGroupMove(row, fromGroup, toGroup, position)`, passed in the second argument
of `rowReorder`:

```tsx
import { groupingPanel } from "@adapttable/mantine/grouping-panel";
import { rowReorder } from "@adapttable/mantine/row-reorder";

features={[
  groupingPanel("team"),
  rowReorder(onRowReorder, { onGroupMove, movePolicy: "confirm" }),
]}
```

`RowGroupRef.levels` gives the host every grouping column and raw destination
value. `movePolicy` is `"never"` by default, `"confirm"` for a kit-native
confirmation, or `"auto"` for an immediate host write. See
[row reordering](./row-reordering.md) for the complete contract.

## Options

`groupingPanel(groupBy?, extras?)` — omit the first argument for an initially
empty user-configurable panel, or pass a column key / ordered list. Companion
options go in the second argument:

| Field / prop                | Type                                                            | Default | Description                                                                                       |
| --------------------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `groupBy` (1st arg)         | `string \| readonly string[]`                                   | `[]`    | Initial ordered grouping keys. The panel, composed column menu, URL, and source can change them.  |
| `onGroupByChange`           | `(groupBy: readonly string[]) => void`                          | —       | Controlled change channel; falls back to `source.setGroupBy`.                                     |
| `groupAggregates`           | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —       | Per-group cells — **same signature as `summaryRow`**. Omit for headers without subtotals.         |
| `groupSort`                 | `GroupSort<TRow>`                                               | —       | `"label"`, `"label-desc"`, `"count"`, `"count-desc"`, or `(a, b) => number` over `GroupNode`s.    |
| `groupFilter`               | `(group: GroupNode<TRow>) => boolean`                           | —       | Keep only the groups this accepts — each group with its `value`, `label`, `level` and `leafRows`. |
| `groupFooters`              | `boolean`                                                       | `false` | Close every group with a footer row carrying its aggregates.                                      |
| `groupPageSize`             | `number`                                                        | —       | Top-level groups shown before a "Show more groups" row.                                           |
| `groupRowPageSize`          | `number`                                                        | —       | Rows shown per group before a "Show more in this group" row.                                      |
| `onGroupLoadMore`           | `(groupKey: string) => void`                                    | —       | Server tier: fetch the rest of a group.                                                           |
| `collapsedGroupIds`         | `readonly string[]`                                             | —       | Controlled collapsed group keys (ephemeral — not URL-synced).                                     |
| `onCollapsedGroupIdsChange` | `(ids: string[]) => void`                                       | —       | Controlled collapse channel; uncontrolled mode uses internal state.                               |

`labels` on `DataTable` overrides group headers, panel controls, menu actions,
aggregation names, and announcement templates.

## Grouped tables are a full-set view

With grouping active the table renders **every filtered row** (grouped),
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
| `GroupAggregatesFn`                            | The `(rows) => Partial<Record<string, DisplayValue>>` mapper shared with `summaryRow`.         |
| `formatGroupLabel`                             | The header label for a bucket value (localized blank-value fallback included).                 |
| `groupSelectionState` / `HeaderSelectionState` | Tri-state for a group checkbox over its leaf ids — the same enum the header select-all uses.   |
| `windowGroupedEntries`                         | Slice a flat grouped model to a virtual window (see [Virtualization](./virtualization.md)).    |

The panel state is headless too. `GroupAggregateOverride` is an
`AggregateOperationId` (a built-in name or a custom operation id) or `"none"`,
and
`GroupAggregateOverrides` maps column keys to those choices.
`serializeGroupAggregateOverrides` / `parseGroupAggregateOverrides` implement
the `groupAgg` codec; `serializeAggregationDerivedKey` is the cache key for
the same effective operations. `withGroupAggregateOverrides` overlays choices on a
client mapper, and `withQueryAggregateOverrides` overlays them on server
aggregate requests. `GroupingPanel` on `@adapttable/<kit>/grouping-panel` is the
kit-wired panel for a host that places it itself; `useGroupPaging` (on
`@adapttable/react`) holds the "show more" state. Adapter authors build the
panel with `GroupingPanelChrome` and its required slots.

## Notes

- Bucketing uses the column's `groupValue`, then its `sortValue`, then a path
  lookup on the column's data path — its `i18n` entry for the active
  `locale`, else its key — never the JSX `accessor`.
- Works on desktop rows and mobile cards, LTR and RTL, with and without the
  `virtualize()` feature (virtual windows count collapsed groups as one row).
- The grouping panel configures row grouping and per-group aggregates.
  Pivoting remains a separate model — see [Pivot](./pivot.md).
- Ant Design maps group headers onto its high-level `Table` via custom row
  rendering; every other kit renders native group header rows/cards.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/) —
rows are grouped by team with a budget subtotal per group.
