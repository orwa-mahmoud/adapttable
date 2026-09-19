# React pivot table — rows, columns and measures

Grouping answers "what is the total per team". A pivot answers "what is the
total per team **per quarter**" — and that second dimension has to become
columns that were never in the data.

`@adapttable/core/pivot` is a separate entry, so a table that never pivots
never downloads the engine. It costs 2.1 KB gzipped to the tables that import
it and nothing to the rest, which the bundle budget checks on every build.

## The shape

```tsx
import { pivot } from "@adapttable/core/pivot";

const result = pivot(sales, {
  rows: ["region", "team"], // down the side, outermost first
  columns: ["quarter"], // across the top
  measures: [{ key: "amount", agg: "sum" }],
});
```

`pivot` is the whole calculation and none of the rendering. It returns:

| Field          | What it is                                                            |
| -------------- | --------------------------------------------------------------------- |
| `columnLeaves` | The rendered columns, left to right — the order every row's cells use |
| `columnTree`   | The header tree, each node carrying the `span` its header cell needs  |
| `rows`         | Every line of the body, in render order                               |
| `rowDepth`     | How many dimensions are down the side                                 |

Each line has a `kind` — `"leaf"`, `"subtotal"` or `"grandTotal"` — a `depth`
for indentation, a `label`, a `count` of the source rows it covers, and one
cell per entry of `columnLeaves`.

## Rendering it with your kit

`pivot` returns data, and a pivot has three shapes an ordinary table does not:
header cells that span, a row-header area down the side, and lines that are
totals rather than data. `pivotTableModel` maps them onto mechanisms the table
already has, so the result goes straight into the `DataTable` you are already
using:

```tsx
import { pivot, pivotTableModel } from "@adapttable/core/pivot";
import { DataTable } from "@adapttable/mantine";

const result = pivot(sales, config, { collapsed });
const model = pivotTableModel(result, { fields, labels });

<DataTable {...model} />;
```

The table is your kit's, with its own header groups, footer and sticky header —
nothing here draws a `<table>`:

| What the engine returns | What it becomes                                         |
| ----------------------- | ------------------------------------------------------- |
| `columnTree`            | `column.group`, one header row per level, spans and all |
| `columnLeaves`          | One column each, keyed `pivot-0`, `pivot-1`, …          |
| `rows`                  | The table's rows, keyed by the engine's own line key    |
| The grand-total line    | `summaryRow` — the column-aligned footer                |
| The grand-total column  | Its own header group, captioned from `labels`           |

The row-header column is keyed `PIVOT_ROW_COLUMN_KEY` (`"pivot-row"`) and each
measure column carries its `PivotColumnLeaf` in `column.meta.pivotLeaf`, so a
host can find the measure and the column path behind any cell.

Options are all optional: `fields` captions the measures (the same list the
panel takes), `labels` localizes the grand-total captions, `rowHeader` names the
corner cell — pass your row dimensions' captions, or take the localized "Rows" —
and `indent` is the pixels per nesting level down the side.

**The fold control is yours.** Core ships no user-facing controls, so
`renderRowHeader` hands you each body line and you render what it needs — a
subtotal line's `kind` says it is foldable and its `key` is the collapse key:

```tsx
pivotTableModel(result, {
  renderRowHeader: (row) =>
    row.kind === "subtotal" ? (
      <Button variant="subtle" onClick={() => toggle(row.key)}>
        {row.label}
      </Button>
    ) : (
      row.label
    ),
});
```

Rows that are totals are marked for styling: every row-header cell carries
`data-adapttable-part="pivot-row-header"` with a `data-pivot-kind` of `leaf`,
`subtotal` or `grandTotal`, and the row itself is yours through the table's
`rowClassName`.

## Measures

A measure is a column key and an aggregation:

```tsx
measures: [
  { key: "amount", agg: "sum" },
  { key: "amount", agg: "count", label: "Deals" },
];
```

`sum`, `avg`, `count`, `min` and `max` are built in; anything else is a
function over the values found, the same `Aggregator` shape the summary row
and group aggregates take:

```tsx
measures: [{ key: "amount", agg: (values) => `${values.length} sales` }];
```

Every measure repeats under every column path, so two measures under three
quarters is six columns — the header tree's spans already account for it.

Values resolve through a column's `sortValue` when you pass `columns`, exactly
as sorting, grouping and the summary row do. A pivot that read raw fields
would disagree with the footer of the same table:

```tsx
pivot(sales, config, { columns });
```

## Subtotals, totals and collapsing

Subtotals are on by default: every level above the innermost gets a line, and
those lines come **before** their children rather than after. That is what
makes collapsing work — a collapsed group still shows its own line with its
own totals instead of vanishing.

```tsx
const result = pivot(sales, config, { collapsed: new Set(["EU"]) });
```

A subtotal line's `key` is its collapse key. Collapsing changes what is shown
and never what is computed: the grand total is the same number either way. Those
keys are what [the URL carries](#in-the-url), so a folded group travels with the
link.

Turn either off with `subtotals: false` / `grandTotals: false`. The grand-total
**column** only appears when something splits the columns — without column
dimensions it would repeat the only column there is.

## What it does not throw away

A row whose dimension value is missing gets its own bucket, labelled `—`
(`PIVOT_BLANK`), rather than being dropped. Rows falling into no bucket and
quietly disappearing is how a pivot table ends up lying about a total.

A value that is not summable is absent, not zero — a missing budget is not a
$0 budget, so a cell with nothing to add up reads as empty.

## Building the configuration

The panel a user drags fields around in is a separate concern from the pivot
itself, and the part of it that is not a widget lives here too:

```tsx
import {
  assignField,
  availableFields,
  moveField,
  removeField,
  setMeasureAgg,
  EMPTY_PIVOT_CONFIG,
} from "@adapttable/core/pivot";

const [config, setConfig] = useState(EMPTY_PIVOT_CONFIG);

setConfig(assignField(config, "team", "rows")); // put Team on the rows axis
setConfig(moveField(config, "rows", 1, -1)); // one step out — the keyboard path
setConfig(setMeasureAgg(config, 0, "avg"));
```

Every operation returns a new configuration and none of them can produce an
invalid one: placing a dimension on one axis takes it off the other rather than
pivoting the same field twice, an index past the end appends, and a step past
either end is a no-op rather than a wrap. Measures are the exception to "one
field, one axis" — summing and counting the same column in one pivot is an
ordinary thing to want, so `assignField` adds a measure rather than moving one.

`availableFields(fields, config)` is what the panel's unused list shows, and
`isPivotReady(config)` is false until something fills the cells — a pivot with
no measure is a half-built configuration, not an error.

## The configuration panel

`PivotPanelChrome` from `@adapttable/react/adapter` is the panel itself: three
zones, the fields in each, and the controls that move them. Structure, part
names, ordering and labels live in core; every visible control is a required
slot the adapter fills with its own kit's component, so a Mantine panel is
built from Mantine buttons and an antd panel from antd buttons.

Every adapter ships it pre-wired as `PivotPanel`, so a host imports one
component rather than assembling slots:

```tsx
import { PivotPanel } from "@adapttable/mantine";

<PivotPanel fields={fields} config={config} onChange={setConfig} />;
```

Underneath, `PivotPanel` is `PivotPanelChrome` with that kit's slots filled in:

```tsx
<PivotPanelChrome
  fields={fields}
  config={config}
  onChange={setConfig}
  slots={slots}
/>
```

Its `PivotPanelChromeProps` take the fields, the configuration and a change
handler — the panel never holds the configuration itself. `PivotPanelSlots`
names the five pieces a kit supplies, each with its own props type:
`PivotPanelSurfaceProps` for the body, `PivotZoneProps` for a titled zone,
`PivotFieldProps` for one field and its move/remove controls, `PivotAddProps`
for the control that adds a field, and `PivotAggProps` for a measure's
aggregation chooser.

Every pivot UI in every spreadsheet is drag-and-drop, and every one of them is
unusable without a mouse. This panel is keyboard-first instead: each field
carries buttons that move it one step, so the whole thing is drivable with Tab
and Enter. A kit that wants dragging can add it on top — nothing here forbids
it and nothing depends on it. The move controls are withheld at each end
rather than disabled, because a field at the top has nowhere up to go.

Drop it into a [side panel](./customization.md) as that panel's content, and
the pivot configuration lives beside the table rather than over it.

## Pivoting on the server

A pivot over ten million rows is not a browser's job. When the server can do
it, send the configuration and translate the answer:

```tsx
import { serverPivotResult } from "@adapttable/core/pivot";

const result = serverPivotResult(page, { config });
```

`serverPivotResult` is a translator, not a second engine. The server decides
the arithmetic and the ordering; core rebuilds the column tree, the spans and
the leaf ordering from the paths the server named, so the result is the _same_
`PivotResult` the local engine returns and every adapter renders one thing.

The wire format is small on purpose — a `QueryPivotPage`:

```ts
{
  // column-dimension paths, outermost value first, in display order.
  // One entry per PATH, not per rendered column: the measures multiply them.
  columns: [["EU", "Q1"], ["EU", "Q2"], ["US", "Q1"]],
  rows: [
    { path: ["EU"], cells: [30, 20, 0], totals: [50], subtotal: true },
    { path: ["EU", "Alpha"], cells: [30, 20, 0], totals: [50], count: 12 },
  ],
  total: { path: [], cells: [30, 20, 10], totals: [60] },
}
```

`count`, `subtotal`, `totals` and `total` are optional: a server that can pivot
but not count, or that has no subtotals, should not have to send empty fields to
say so. A cell the server omits is an empty cell, never a zero — the same rule
the local engine follows for a value that will not add up.

The grand-total **column** follows the local rule: it is there when
`grandTotals` is on, which is the default, and something splits the columns. Its
values are each line's `totals`, one per measure, because that column is
arithmetic rather than shape — summing sums is not how an average or a minimum
totals, so core does not guess it. Send `totals` and the column carries numbers;
omit it and the column is empty, like any other cell nobody sent; ask for
`grandTotals: false` and there is no column at all.

## In the URL

A pivot is the most expensive table state there is to rebuild by hand — two
axes, an order on each, and a measure list — which makes it the state most
worth putting in a link:

```tsx
import { pivot, usePivotUrlState } from "@adapttable/core/pivot";

const { config, onConfigChange, collapsed, onCollapsedChange } =
  usePivotUrlState();

const result = pivot(rows, config, { collapsed });

<PivotPanel fields={fields} config={config} onChange={onConfigChange} />;
```

The parameter is compact and readable rather than JSON in a query string:

```
?pivot=rows:region,team;cols:quarter;sum:amount;count:amount;sub:0;hide:EU/Alpha
```

Everything a reader can change travels: the two axes, the measures, the
subtotal and grand-total switches (`sub:0`, `grand:0`) and which groups are
folded (`hide:`). A link that carried the axes alone would reopen showing
numbers its sender had switched off, or lines they had folded away.

Only departures are written. Both switches default to on, so a parameter says
so by staying silent — which is also what makes the encoding backward
compatible: a link or a saved view from before those fields existed says
nothing about them and reads back exactly as it always did. A folded path is
percent-encoded per dimension value, so a team called `A/B` cannot split a path
in the wrong place, and `collapsed` hands straight to the engine.

`serializePivot` and `deserializePivot` are exported for saved views and
anywhere else a `PivotConfig` has to be stored; `serializePivotState` and
`deserializePivotState` are the same encoding including the folded set, as a
`PivotUrlState` (`config` and `collapsed`). The round trip is tested, not
assumed, and a hand-edited value degrades to a simpler pivot instead of
throwing — a URL is user input.

All four are also on [`@adapttable/core/query`](./server-queries.md#decoding-a-parameter-yourself),
the React-free entry, so a route handler can read the parameter a shared link
carries without importing the engine or React.

An empty pivot writes no parameter — folds included, since there is nothing to
fold — and `urlKey` namespaces it so two tables can share one URL.

A custom aggregator has no URL form, so a measure carrying one keeps working
in memory and is left out of the link. Writing `sum` instead would quietly
change what the link computes.

Related: [row grouping](./row-grouping.md) ·
[aggregation](./row-grouping.md#aggregates) · [API reference](./api.md)
