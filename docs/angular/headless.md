# Headless Angular tables with signals

`injectDataTable` provides rows, columns, state, localized labels and attribute
records as signals. It renders nothing. Use it when you own the markup; use a
kit's `AdaptDataTable` when you want its complete toolbar, responsive layouts
and optional feature surfaces.

## A small custom table

```ts
import { Component, signal } from "@angular/core";
import {
  AdaptAttrs,
  AdaptCell,
  AdaptHeader,
  AdaptTableStatusAnnouncer,
} from "@adapttable/angular/adapter";
import {
  injectDataTable,
  injectFrontendData,
  type ColumnDef,
} from "@adapttable/angular";

interface Person {
  id: string;
  name: string;
  age: number;
}

@Component({
  selector: "headless-people-table",
  standalone: true,
  imports: [AdaptAttrs, AdaptCell, AdaptHeader, AdaptTableStatusAnnouncer],
  template: `
    <input [adaptAttrs]="table.searchInputAttrs()" />
    <table [adaptAttrs]="table.tableAttrs()">
      <thead>
        <tr [adaptAttrs]="table.headerRowAttrs()">
          @for (column of table.columns(); track column.key) {
            <th [adaptAttrs]="table.headerCellAttrs(column)">
              <button
                [adaptAttrs]="table.sortButtonAttrs(column)"
                [adaptHeader]="column"
              ></button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of table.rows(); track row.id; let i = $index) {
          <tr [adaptAttrs]="table.rowAttrs(row, i)">
            @for (column of table.columns(); track column.key) {
              <td
                [adaptAttrs]="table.cellAttrs(column)"
                [adaptCell]="column"
                [adaptCellRow]="row"
                [adaptCellIndex]="i"
              ></td>
            }
          </tr>
        }
      </tbody>
    </table>
    @if (table.isEmpty()) {
      <p>
        {{
          table.emptyVariant() === "noResults"
            ? table.labels().noResults
            : table.labels().noData
        }}
      </p>
    }
    <button
      type="button"
      [disabled]="source().page <= 1"
      (click)="table.setPage(source().page - 1)"
    >
      Previous page
    </button>
    <button
      type="button"
      [disabled]="source().page * source().limit >= source().total"
      (click)="table.setPage(source().page + 1)"
    >
      Next page
    </button>
    <adapt-table-status-announcer [announcement]="table.statusAnnouncement()" />
  `,
})
export class HeadlessPeopleTable {
  readonly rows = signal<Person[]>([{ id: "ada", name: "Ada", age: 36 }]);
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", sortable: true },
    { key: "age", sortable: true },
  ];
  readonly source = injectFrontendData({
    data: this.rows,
    columns: this.columns,
    paginationMode: "paged",
    urlSync: false,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: this.columns,
    rowKey: (row) => row.id,
    tableLabel: "People",
  });
}
```

This example deliberately draws a flat, paged table. Its own Previous/Next
labels need translation in a multilingual app. The source is in memory; a
remote shell must also render `errorState()`, `bodyRegion()` and
`isRefreshing()` so first loading, refreshes and failures are visible.

## Read signals; invoke actions

`source` must be a `Signal<TableSource<TRow>>`. `injectFrontendData`,
`injectServerData` and `injectQuerySource` already return that shape. A kit
shell additionally accepts a plain source value, but the headless function
requires a signal.

Call `table.rows()`, `table.columns()`, `table.pagination()` and
`table.labels()` where you render or derive values. Invoke actions such as
`table.setPage(2)`, `table.setLimit(50)` and `table.toggleSort("name")`
without replacing the controller. Injection functions belong in Angular
field initializers/constructors, or receive an explicit `injector` when their
API supports it. Subscriptions and effects end with that injector's lifetime.

## Preserve whole attribute records

`AdaptAttrs` applies attributes, styles, controlled properties, events and
refs to the semantic DOM element. Bind complete records from
`tableAttrs`, `headerCellAttrs`, `sortButtonAttrs`, `rowAttrs`, `cellAttrs`
and `searchInputAttrs`. Copying only an ARIA label can discard keyboard
behavior, pinning offsets or controlled input values.

Use `adaptAttrsTarget` when a UI component wraps the actual table or focusable
element. A target getter follows inner-element replacement; `null` waits,
and `undefined` uses the directive's own host.

## Rendering beyond a flat table

`headerPlan()` supplies grouped header rows; `layout()` supplies hidden,
ordered, pinned, sized and renamed columns. `AdaptCell`, `AdaptHeader` and
`AdaptFooter` stamp a column's Angular renderer. For declarative templates,
collect `viewChildren(AdaptCellTemplate)` and pass the query signal as
`cellTemplates` to `injectDataTable`.

Mobile rendering uses `isMobile()`, `cardAttrs()` and the mobile-visible
columns. Infinite rendering uses `canLoadMore()`, `loadMoreAttrs()` and
`loadMoreButtonAttrs()`. Bind those records so the observer and the explicit
load-more button share the source's guarded operation.

Passing a feature only assembles its configuration and contributions. A custom
shell must place its `AdaptSlot` outlets, build the required runtime and mount
feature lifecycles to get the full kit experience. It must also provide a
permanent status announcer, empty/error surfaces and any requested grid or
row-operation announcements.

See [Building an adapter](./building-an-adapter.md),
[Data tiers](./data-tiers.md), [Columns](./columns.md),
[Accessibility](./accessibility.md) and the
[Angular API reference](../api.md#the-angular-binding).
