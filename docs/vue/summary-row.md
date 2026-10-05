# Vue summaries and footers

`summaryRow` maps the rows in the current source view to values keyed by column
key. The Vue binding renders those values in a column-aligned table footer or
a final mobile summary card. Shared Vue models and Chrome own the footer
behavior, so adapters can reuse it without reimplementing totals or layout.

```vue
<script setup lang="ts">
import { aggregate } from "@adapttable/vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";

interface Invoice {
  id: string;
  amount: number;
}
const rows: readonly Invoice[] = [
  { id: "one", amount: 125 },
  { id: "two", amount: 75 },
];
const columns: readonly ColumnDef<Invoice>[] = [
  { key: "id", footer: () => "Page total" },
  { key: "amount", header: "Amount" },
];
const summaryRow = aggregate<Invoice>({ amount: "sum" });
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :summary-row="summaryRow"
    :url-sync="false"
  >
    <template #tableFooter><p>Reviewed today.</p></template>
  </DataTable>
</template>
```

## Which rows are summarized

- A paged frontend source supplies its current filtered page. Changing page,
  search or filters updates the summary.
- An infinite source supplies its currently loaded rows.
- A grouped frontend view supplies the filtered rows used by its groups.
  Collapsing a group changes which rows are shown, not the grand total.
- A host/server source supplies its current `rows`. Its `total` count does not
  give the table access to unloaded records.
- Host-provided pinned summary rows are independent presentation rows. They
  are not added to `summaryRow` input.

For a total over data that the table does not own, return a total held by your
host instead: `summaryRow: () => ({ amount: serverTotal.value })`. The mapper
can read Vue refs and computed values; changes remain reactive even when the
source row array is unchanged. Neutral incremental sources can carry already
computed aggregates. Those aggregates take precedence over a duplicate mapper.

## Rendering a footer cell

The column's `footer` renderer receives `FooterContext<TRow>` with `column` and
`value`. It takes precedence over the table's `footer` scoped slot. Both can
return Vue nodes, and a renderer's explicit `null` result stays empty.
Keep the setup from the first example and use this body inside its `<template>`.

```vue
<DataTable
  :data="rows"
  :columns="columns"
  :row-key="(row) => row.id"
  :summary-row="summaryRow"
  :url-sync="false"
>
  <template #footer="{ column, value }">
    <strong v-if="column.key === 'amount'">{{ value }}</strong>
  </template>
</DataTable>
```

The summary row also appears when a visible column has a `footer`, or the
`footer` slot exists, without requiring a `summaryRow`. Its value is then
`undefined`. With none of these configured, no summary surface is rendered.

Desktop summary cells follow effective column order, visibility, collapsed
groups, widths and logical pinning. Selection, reorder and action columns get
empty padding cells; row-detail controls live inside data cells and need no
extra footer column. Body cell spans do not merge the footer. Column
virtualization uses the same rendered columns and spacer widths as the body.

Mobile cards use column mobile labels and footer renderers. Unpopulated fields
without a footer renderer are omitted. Summary cards have no selection,
editing, row actions or detail controls. A table in its loading or empty state
keeps that state surface instead of showing an empty data table.

## Custom content below the table

The `tableFooter` slot is free content below the scroll surface and above the
pager. It stays independent of the column summary and is also available in
loading and empty states. Use it for explanatory notes or your own components.

## Styling and adapter contracts

| Class name                          | Semantic element / part                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `summary`                           | `tfoot[data-adapttable-part="summary"]`                                                     |
| `summaryRow`                        | `tr[data-adapttable-part="summary-row"]`                                                    |
| `summaryCell`                       | Every footer `td[data-adapttable-part="summary-cell"]`, including utility pads              |
| `summaryCard`                       | Final `article[role="listitem"][data-adapttable-part="summary-card"]`; also receives `card` |
| `cardRow`, `cardLabel`, `cardValue` | Summary card's field container, `dt`, and `dd`                                              |
| `tableFooter`                       | `div[data-adapttable-part="table-footer"]`                                                  |

Adapter authors can reuse `useSummaryCells`, `useTableSummaryModel`,
`TableSummaryChrome`, `MobileSummaryChrome` and `TableFooterChrome` from
`@adapttable/vue/adapter`. `useDataTableShell` already attaches the summary models
to its desktop/mobile projections. An adapter with a fallback footer slot
forwards it as both the shell option `footer` and `TableChromeSlots.footer`;
the shell uses its presence to enable a slot-only summary. All visible content comes from host values
or renderers; the binding adds no interactive controls.

`TableSummaryModel<TRow>` exposes the readonly `cells` rendered by either
layout. Each `TableSummaryCellModel<TRow>` contains its column key, attributes,
label and typed `FooterContext<TRow>`. Both types are available from
`@adapttable/vue` and `@adapttable/vue/adapter`, so a custom shell can name its
summary projection without importing an internal module.

See the [Vue footer demo](/vue/demo/unstyled/table-footers/) for paging, search,
mobile cards, hidden columns and logical pinning in both writing directions.

### Building the summary projection

`SummaryCells` from `@adapttable/vue/adapter` is
`Readonly<Partial<Record<string, unknown>>>`, the values indexed by column key.
`useSummaryCells<TRow>(rows, summaryRow)` accepts a getter for the source rows
and a getter for the optional `SummaryRowFn<TRow>`. It returns
`ComputedRef<SummaryCells | undefined>`, using neutral incremental aggregates
when present or the current mapper otherwise.

`useTableSummaryModel<TRow>(table, columns, values, hasFooterSlot)` accepts the
`UseDataTableResult` plus getters for the effective columns, summary values
and fallback footer-slot presence. It returns
`ComputedRef<TableSummaryModel<TRow> | undefined>`. No model is produced unless
values, a column footer or the fallback footer slot enables it. A custom shell
must pass the same effective columns used by its body, including any horizontal
window, so labels, widths, pins and order stay aligned.

Both layout renderers accept `TableSummaryChromeProps<TRow>`: the required
`model`, optional `footer(context): VNodeChild` fallback, and optional
`TableSummaryClassNames`. The class contract includes `summary`, `summaryRow`,
`summaryCell`, `summaryCard`, `card`, `cardFields`, `cardRow`, `cardLabel` and
`cardValue`. `TableSummaryChrome` additionally accepts `leading` and `trailing`
utility-column keys plus `startSpacer()` and `endSpacer()` renderers. Supply
the body's matching pads and spacers. `MobileSummaryChrome` uses the shared
props to render labeled fields in a list item.

`TableFooterChrome({ content, className? })` takes a `content(): VNodeChild`
callback for the separate below-table region. It does not participate in
column totals or require a summary model. All these helpers belong to the
binding's `/adapter` entry; ordinary native tables use the `summaryRow`,
`footer` and `tableFooter` interfaces shown above.
