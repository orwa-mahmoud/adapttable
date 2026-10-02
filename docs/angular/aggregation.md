# Angular aggregation and summaries

`aggregate()` from `@adapttable/angular` creates a rows-to-summary function.
Pass it to `[summaryRow]` for a table footer or to `groupAggregates` for group
subtotals. Aggregation computes values; it does not write totals into your data.

```ts
import { Component } from "@angular/core";
import { aggregate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { groupingPanel } from "@adapttable/ng-zorro/grouping-panel";

interface Invoice {
  id: string;
  team: string;
  amount: number;
}

@Component({
  selector: "app-invoice-totals",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Invoice totals"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [summaryRow]="summary"
      [features]="features"
    />
  `,
})
export class InvoiceTotals {
  readonly rows: readonly Invoice[] = [
    { id: "i1", team: "Design", amount: 120 },
    { id: "i2", team: "Design", amount: 80 },
  ];
  readonly rowKey = (row: Invoice) => row.id;
  readonly columns: readonly ColumnDef<Invoice>[] = [
    { key: "team", header: "Team" },
    {
      key: "amount",
      header: "Amount",
      sortValue: (row) => row.amount,
      formatAggregate: (value) =>
        typeof value === "number" ? `$${value.toFixed(2)}` : value,
    },
  ];
  readonly summary = aggregate<Invoice>(
    { amount: "sum" },
    {
      columns: this.columns,
      format: (value) =>
        typeof value === "number" ? `$${value.toFixed(2)}` : value,
    }
  );
  readonly features = [
    groupingPanel<Invoice>("team", {
      groupAggregates: aggregate<Invoice>(
        { amount: "sum" },
        { columns: this.columns }
      ),
      groupFooters: true,
    }),
  ];
}
```

Both Angular kits are private workspace packages. Use the equivalent
`@adapttable/angular-unstyled` imports for native controls; `aggregate` always
comes from the binding.

## Values and formatting

Built-in names are `sum`, `avg`, `count`, `min` and `max`. A spec maps column
keys to those names, a registered operation ID, or a custom aggregator function.
Values resolve through `sortValue` when columns are supplied, otherwise through
the column key's data path. A formatted Angular cell does not force aggregation
to parse its rendered text. Blanks and nonnumeric values are not silently
treated as a zero amount; choose a custom aggregator for a different domain rule.

`aggregate(spec, { format })` formats the result at computation time.
`column.formatAggregate(value, context)` formats group presentation and can
inspect the operation name. With both configured, the column receives what
the mapper already returned. Prefer raw group values with column formatting to
avoid formatting twice. For the table's `summaryRow`, use the mapper's `format`
or an Angular `footer` renderer; that path does not call the group formatter.

The table passes its current source rows to `summaryRow`. A normal paged source
therefore gives a page total, while the grouped view can expose the full
filtered set. For a dataset-wide server total, use the backend's reported total
and a mapper that returns it. Do not sum one downloaded page and label it as
the whole dataset.

## Reader-selected and server aggregates

The grouping panel can add and change eligible column operations. Declare
numeric values and appropriate operation metadata so the panel offers useful
choices. Reader overrides participate in query/URL state, and server sources
must honor the declared aggregate contract to provide complete results. A
formatted subtitle is not evidence that the server executed the requested
aggregation.

Keep stale or failed server totals visibly associated with their query, and
show loading/error state while a replacement is pending. Permission checks for
grouped or aggregated data belong on the server just as they do for raw rows.
Read-only aggregation never implies permission to edit the source cells.

Group controls work with keyboard and mobile group cards. The table footer is
a column-aligned summary; use [pinned summary rows](./pinned-summary-rows.md)
when totals need the explicit top/bottom placement that feature supplies.

See [Row grouping](./row-grouping.md), [Pivot](./pivot.md),
[Exporting](./exporting.md) and the
[aggregation contract](../../packages/shared/core/src/aggregate/aggregate.ts).
