# Angular pinned summary rows

`pinnedSummaryRows({ top, bottom })` renders host-supplied summary objects
above or below the body. They use the ordinary column renderers but do not
enter the data source's filtering, sorting, grouping, pagination or selection.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { pinnedSummaryRows } from "@adapttable/angular-unstyled/pinned-summary-rows";

interface BudgetRow {
  id: string;
  name: string;
  budget: number;
}

@Component({
  selector: "app-budget-summary",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [maxHeight]="320"
      [urlSync]="false"
    />
  `,
})
export class BudgetSummary {
  readonly rows: BudgetRow[] = [
    { id: "ada", name: "Ada", budget: 100 },
    { id: "grace", name: "Grace", budget: 200 },
  ];
  readonly columns: ColumnDef<BudgetRow>[] = [
    { key: "name", header: "Name" },
    { key: "budget", header: "Budget" },
  ];
  readonly rowKey = (row: BudgetRow) => row.id;
  readonly features = [
    pinnedSummaryRows<BudgetRow>({
      bottom: [{ id: "all-budget", name: "All budgets", budget: 300 }],
    }),
  ];
}
```

For NG-ZORRO, use `@adapttable/ng-zorro` and its `/pinned-summary-rows`
entry. The factories are implemented in both unpublished workspace kits;
see [getting started](./getting-started.md).

## Host ownership and scope

The host decides what a total means: the entire database, the current
query, a subset or a manually supplied target. The example's 300 is a
host-owned total; filtering the two data rows does not recalculate it.
Do not imply that a server-page sum is an all-results sum. Obtain global
aggregates from your endpoint when needed.

Both edges accept multiple records. Use values compatible with the column
accessors and renderers and provide sensible stable `rowKey` values for the
summary objects. The binding's internal summary identities are namespaced
separately from data rows.

Summary rows are named with the localized `pinnedSummaryRow` label. They
have no selection checkbox, reorder control, row-detail disclosure or row
actions, and do not become row-navigation stops. On phones they render as
summary cards using the same fields. The `pinned-summary-top` and
`pinned-summary-bottom` parts identify the two edges.

These summaries work with grouped and tree tables. That differs from
[data-row pinning](./row-pinning.md), whose records belong to the source and
whose pinning is refused in those shapes.

## Footer aggregates and persistence

Use the shell's `[summaryRow]` input with the binding's `aggregate()` helper
when you want an aggregate footer calculated from the table's available
data. A column's `footer` renderer formats that summary value. This footer
is separate from the independent top/bottom objects shown here; see
[aggregation](./aggregation.md).

When summary content changes, create a new `pinnedSummaryRows()` feature with
the replacement objects and bind the updated feature list. The mounted table
uses the new content without resetting unrelated table state. Summary objects
are content, not view state, and are not stored in the URL or saved views.

For custom rendering, use Angular `cell` templates or components as on
ordinary [columns](./columns.md). Pass `[labels]` and `dir` for the summary's
accessible name and reading direction.
