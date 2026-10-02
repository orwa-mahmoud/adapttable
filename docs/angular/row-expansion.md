# Angular row expansion

`rowDetail(renderer, defaultExpandedRowIds?)` adds a disclosure before each
row and renders content beneath an expanded row. The renderer is an Angular
standalone component or `TemplateRef<RowDetailContext<TRow>>`.

```ts
import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { rowDetail } from "@adapttable/angular-unstyled/row-detail";

interface Person {
  id: string;
  name: string;
  bio: string;
}

@Component({
  selector: "app-person-detail",
  template: `<p>{{ row().bio }}</p>`,
})
export class PersonDetail {
  readonly row = input.required<Person>();
}

@Component({
  selector: "app-expand-people",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
    />
  `,
})
export class ExpandPeople {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada", bio: "Works on the analytical engine." },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [rowDetail<Person>(PersonDetail, ["ada"])];
}
```

Use the NG-ZORRO root and `/row-detail` imports together for its disclosure
control. Both kits are unpublished workspace packages; see
[getting started](./getting-started.md).

## Renderer and lifecycle

The context contains `$implicit` and `row`. An `ng-template` can use
`let-row`, while a component declares `row = input.required<TRow>()` as
above. Only declared component inputs receive context values.

The shell reads its features when it initializes. When using a template
queried with `viewChild`, make sure the template exists before constructing
the mounted table's feature list. Do not read a required view query in a
field initializer before Angular has created that view. A component renderer
avoids that ordering issue.

Several rows may be open at once. Expansion is keyed by stable row ID, so a
row can leave the page and return with its panel still open during that
table's lifetime. It is separate from tree expansion and group collapse and
is not written into URL state or saved views. The optional ID array seeds
the initial open set; it is not a controlled input.

On collapse, the detail content is removed. A detail component should own
and clean up its subscriptions or requests with its Angular lifecycle. The
table does not provide a detail-fetch callback or an automatic error panel;
render loading, error and retry states in the detail component if needed.

## Layout and accessibility

Desktop details span the body columns in the row immediately after their
owner. Mobile cards place the same content in `card-detail`. The disclosure
is a kit button with localized expand/collapse labels and `aria-expanded`,
so normal keyboard activation works. Direction follows the table's `dir`.
Virtualized row/detail pairs are measured together so opening a panel can
change the visible row height.

For another complete table inside a detail, use
[nested tables](./nested-tables.md) to obtain the child defaults and a named
region. For hierarchical data in one table, use [tree data](./tree-data.md).
