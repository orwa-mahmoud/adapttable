# Angular table sorting and multi-sort

Set `sortable: true` on a column to expose its sort control. A normal click
cycles ascending, descending and off. On a frontend source the engine compares
values; on a server source it sends the column key and direction to the host.

## Declare sortable values

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { multiSort } from "@adapttable/ng-zorro/multi-sort";

interface Invoice {
  id: string;
  customer: string;
  amount: number;
  issuedAt: string;
}

@Component({
  selector: "invoice-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="invoices"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [defaults]="{ sortBy: 'issuedAt', sortDir: 'desc' }"
      tableLabel="Invoices"
    />
  `,
})
export class InvoiceTable {
  readonly invoices: Invoice[] = [
    { id: "a", customer: "Ada", amount: 1200, issuedAt: "2026-09-01" },
    { id: "b", customer: "Grace", amount: 250, issuedAt: "2026-09-02" },
  ];
  readonly columns: ColumnDef<Invoice>[] = [
    { key: "customer", sortable: true },
    {
      key: "amount",
      sortable: true,
      accessor: (row) => `$${row.amount.toFixed(2)}`,
      sortValue: (row) => row.amount,
      exportValue: (row) => row.amount,
    },
    {
      key: "issuedAt",
      sortable: true,
      sortValue: (row) => Date.parse(row.issuedAt),
    },
  ];
  readonly rowKey = (row: Invoice) => row.id;
  readonly features = [multiSort()];
}
```

A formatted currency string is a presentation value. `sortValue` keeps its
numeric ordering independent of the visible text; `exportValue` gives exports
the same raw amount. Custom templates and components are never a substitute
for a stable comparable value. Use primitives accepted by `SortableValue`.

## Multi-sort

`multiSort()` from your kit's `/multi-sort` entry makes Shift-click add a
column to the existing chain. Each member cycles ascending, descending and
removed. Headers show sort priority. A normal single-column sort replaces
the chain.

With a prebuilt source, `source().setSort("amount", "desc")` sets a single
sort and `source().toggleSortLevel("customer")` changes one chain member.
With `injectDataTable`, pass `multiSort: true` or the feature configuration
when building your own header controls, and bind `sortButtonAttrs(column)`
whole through `AdaptAttrs`.

## Remote data and persistence

A server must implement the advertised sort keys. The table does not sort one
remote page and call that a correctly sorted dataset. `TableQuery.sortLevels`
carries the complete chain; there is no `supports.multiSort` option. Compose
multi-sort only when your endpoint honors it, and use the shared
[server query contract](../server-queries.md) to parse and validate it.

Sort state lives in the source and URL by default. Initial `defaults.sortBy`
and `defaults.sortDir` apply only while the URL is silent. Sorting resets to
page 1; the built-in status announcer reports the resulting sort/range after
the data settles.

On cards, both kits offer a sort-column select instead of relying on a desktop
header. Custom sortable headers must remain real keyboard-operable controls
and preserve the header's sort semantics.

See [Columns](./columns.md), [Column management](./column-management.md),
[Data tiers](./data-tiers.md) and [Accessibility](./accessibility.md).
