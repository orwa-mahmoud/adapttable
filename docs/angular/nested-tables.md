# Nested Angular tables

`nestedTable(row => ({ label, table }))` opens a real table in a row's detail
panel. Its renderer receives the parent row and child defaults; the host
mounts the same kit's `AdaptDataTable` and binds those defaults explicitly.

```ts
import { Component, input } from "@angular/core";
import type { ColumnDef, NestedTableDefaults } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { nestedTable } from "@adapttable/angular-unstyled/nested-table";

interface Order {
  id: string;
  item: string;
}
interface Person {
  id: string;
  name: string;
  orders: Order[];
}

@Component({
  selector: "app-person-orders",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="row().orders"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="defaults().urlSync"
      [searchable]="defaults().searchable"
      [density]="defaults().density"
      [labels]="defaults().labels"
      [tableLabel]="defaults().tableLabel"
    />
  `,
})
export class PersonOrders {
  readonly row = input.required<Person>();
  readonly defaults = input.required<NestedTableDefaults>();
  readonly columns: ColumnDef<Order>[] = [{ key: "item", header: "Item" }];
  readonly rowKey = (row: Order) => row.id;
}

@Component({
  selector: "app-people-with-orders",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      urlKey="people"
    />
  `,
})
export class PeopleWithOrders {
  readonly rows: Person[] = [
    {
      id: "ada",
      name: "Ada",
      orders: [{ id: "o1", item: "Engine" }],
    },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    nestedTable<Person>((row) => ({
      label: `Orders for ${row.name}`,
      table: PersonOrders,
    })),
  ];
}
```

For NG-ZORRO, both table components use `@adapttable/ng-zorro`, with the
feature from its `/nested-table` entry. Both kits currently require
[workspace setup](./getting-started.md).

## What the defaults mean

The defaults set `urlSync: false` and `searchable: false`, carry the parent's
density and labels, and supply the child's accessible `tableLabel`. Binding
them prevents parent and child pagination from competing over one URL. You
can deliberately enable a child search box; if enabling child URL sync,
assign that child its own stable namespace too.

`dir` is not part of `NestedTableDefaults`. For an RTL parent, bind the same
direction explicitly on the child. Features are also not inherited: compose
the child's filters, editing or selection features on the child table.

A template renderer receives defaults as `$implicit` and `defaults`, and
the parent as `row`: `<ng-template let-defaults let-row="row">`. A component
renderer receives its declared inputs, as in the example. Construct a
template-based feature only after the template query is available.

## Expansion, loading and scope

The second factory argument is an optional array of initially expanded
parent IDs. Expansion uses the same state as [row detail](./row-expansion.md)
and works on desktop rows and mobile cards. A returned `undefined` means
that row has no nested table content; it does not remove the feature's
disclosure column. A detail renderer can provide fallback content when both
features are composed.

The region is named from `label`; name it for the actual parent, such as
“Orders for Ada,” rather than “Nested table.” Inner row IDs need to be
unique within the inner table. Selection and query state belong to that
inner instance and do not automatically affect the parent.

The factory does not fetch children. Load data in the host or renderer and
bind loading/error inputs on the inner table. Closing the panel destroys
its rendered child table; reopening creates it again, so keep data or view
state outside the panel if it must survive. For a single hierarchical
dataset with lazy children, use [tree data](./tree-data.md).
