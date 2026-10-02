# @adapttable/angular

**[📖 Documentation](https://adapttable.orwamahmoud.com/)** · **[GitHub](https://github.com/orwa-mahmoud/adapttable)**

Headless Angular binding for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
Signals over the framework-neutral engine in `@adapttable/core`: URL-synced
view state, the in-memory data tier and the headless table, with columns whose
cells render Angular templates or components. It draws no controls; the markup
is yours.

```bash
pnpm add @adapttable/angular @adapttable/core
```

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.
Angular 20 supports that floor; Angular 22 requires Node 22.22.3+, 24.15.0+, or 26+ instead.
Requires Angular 20 or newer (`@angular/core` and `@angular/common`).

## Usage

```ts
import { Component, input } from "@angular/core";
import {
  AdaptAttrs,
  AdaptCell,
  AdaptHeader,
  type ColumnDef,
  injectDataTable,
  injectFrontendData,
} from "@adapttable/angular";

interface Person {
  id: string;
  name: string;
  age: number;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "age", sortable: true },
];

@Component({
  selector: "people-table",
  imports: [AdaptAttrs, AdaptCell, AdaptHeader],
  template: `
    <input [adaptAttrs]="table.searchInputAttrs()" />
    <table [adaptAttrs]="table.tableAttrs()">
      <thead>
        <tr [adaptAttrs]="table.headerRowAttrs()">
          @for (column of table.columns(); track column.key) {
            <th [adaptAttrs]="table.headerCellAttrs(column)">
              <button [adaptAttrs]="table.sortButtonAttrs(column)">
                <span [adaptHeader]="column"></span>
              </button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of table.rows(); track table.rowKey(row); let i = $index) {
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
  `,
})
export class PeopleTable {
  readonly data = input.required<Person[]>();
  readonly table = injectDataTable({
    source: injectFrontendData({ data: this.data, columns }),
    columns,
    rowKey: (row) => row.id,
  });
}
```

Sort, search and page live in the URL, so a reload or a shared link restores
them. Provide `ADAPTTABLE_URL_ADAPTER` to keep them somewhere else, or pass
`urlSync: false` to keep them in memory.

## API

- `injectDataTable` — headless table state and the attributes each element
  carries, as signals
- `injectFrontendData` — the in-memory data tier
- `injectTableUrlState` — the URL-synced view state
- `ColumnDef` — an Angular column whose `cell`, `headerCell` and `footer` are
  an `ng-template` or a component
- `AdaptCell`, `AdaptHeader`, `AdaptCellTemplate`, `AdaptAttrs` — render a
  column's content and apply attribute records
- `provideAdaptTableFeatures` / `ADAPTTABLE_FEATURES` — compose features
  through dependency injection
- `fromStore` — any `@adapttable/core` store as a read-only signal

## License

MIT
