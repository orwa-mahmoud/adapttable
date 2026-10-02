# Angular column menus, sizing and persisted layouts

Column definitions describe the table's starting shape. `ColumnLayoutState`
records a reader's hidden columns, order, logical pins, pixel widths, display
names and collapsed groups. Keep those changes separate from stable column
keys and your row data.

## Compose controls and keep the layout in the URL

```ts
import { Component } from "@angular/core";
import {
  injectColumnLayoutUrlState,
  type ColumnDef,
} from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { fitColumns } from "@adapttable/ng-zorro/fit-columns";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";

interface Person {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: "managed-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [columnLayout]="layout.layout()"
      (columnLayoutChange)="layout.onLayoutChange($event)"
      urlKey="people"
      tableLabel="People"
    />
  `,
})
export class ManagedPeopleTable {
  readonly people: Person[] = [
    { id: "ada", name: "Ada", email: "ada@example.com" },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", sortable: true, minWidth: 140, lockVisibility: true },
    { key: "email", minWidth: 180, flex: 2 },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly layout = injectColumnLayoutUrlState({
    urlKey: "people",
    defaultColumnLayout: { pinned: { name: "start" } },
  });
  readonly features = [columnMenu(), resizableColumns(), fitColumns()];
}
```

Both the table and layout slice use the same namespace for this table. Use
a different namespace for each independent table. See [URL state](./url-state.md)
for browser History and Angular Router integration.

For internal layout state, omit `[columnLayout]` and use
`[defaultColumnLayout]` for initial values. To control state yourself, supply
a complete layout and handle the real `(columnLayoutChange)` output by
updating your signal. A controlled input that never changes will keep rendering
the old layout.

## What each feature adds

- `columnMenu()` exposes visibility, ordering, pinning and auto-size controls
- `resizableColumns()` adds pointer and keyboard resize handles
- `fitColumns()` shares available container width using the columns' flex
  weights, while honoring explicit widths and constraints

Use corresponding paths under `@adapttable/angular-unstyled` for native
controls. The features are independent of sorting and row selection.

The menu offers renaming when you provide `[onColumnRename]` and the column
allows it with `renameable: true`. That callback receives the stable key and
new display name. The layout keeps the name; the key used in server queries
and row operations stays unchanged.

`lockPosition`, `lockVisibility`, `lockWidth` and `lockPin` disable the
corresponding user changes. Use `minWidth` and `maxWidth` for pixel bounds.
Pins use `"start"` and `"end"`, so their edges follow RTL automatically.
Auto-sizing measures rendered content; unloaded server rows cannot contribute
to that measurement.

## Column selection is a different operation

`columnSelectionCheckbox()` from `/column-selection` selects a column's cell
range. It needs `cellNavigation()` from `/cell-navigation`. It does not hide
or reorder columns and is not the row-selection checkbox. The explicit
checkbox makes the grid's whole-column action available to keyboard, touch
and screen-reader users.

## Headless and mobile behavior

`injectDataTable(...).layout()` exposes state and actions including
`setHidden`, `toggleVisible`, `setPinned`, `move`, `setOrder`, `setWidth`,
`setName`, `resetName`, `toggleColumnGroup` and `reset`. Auto-size operations
on the table take the root element to measure. Preserve the complete header
and cell attribute records so sticky offsets, width styles and resize behavior
reach the correct DOM elements.

The desktop Columns menu is not drawn on the card layout. The same controlled
layout still affects card fields; use useful mobile visibility defaults or
host-owned controls when users need to change the arrangement on a phone.

See [Column groups](./column-groups.md), [Columns](./columns.md),
[Cell navigation](./cell-navigation.md), [Saved views](./saved-views.md) and
[Localization and RTL](./i18n-rtl.md).
