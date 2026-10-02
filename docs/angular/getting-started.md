# Get started with AdaptTable for Angular

AdaptTable combines a headless Angular binding with a kit that draws the
controls. Start with `AdaptDataTable`, an array of rows, column definitions and
a stable row key. Add feature imports when the table needs them.

## Choose a kit

- `@adapttable/angular-unstyled` uses native HTML. Supply your own CSS or
  Tailwind classes
- `@adapttable/ng-zorro` uses NG-ZORRO controls, cards and overlays
- `@adapttable/angular` supplies signals, column types and structural Chrome
  for either kit or your own renderer

The binding's current repository version is `0.2.0`. Both kits are **unpublished
workspace packages** with `private: true`; these examples assume your application
can resolve the workspace packages or locally built packages. An npm install of
either kit is not currently a supported distribution path. Package versions are
independent; do not force the binding, core and kit to share a version.

The binding supports Angular 20, 21 and 22. NG-ZORRO's kit targets Angular 22
and NG-ZORRO 22.1.1, including its Angular CDK, Common, Core, Forms,
Platform Browser and Router peers. Load NG-ZORRO's theme once in the host's
global stylesheet:

```css
@import "ng-zorro-antd/ng-zorro-antd.min.css";
```

The native kit does not supply a theme stylesheet.

## A standalone table

```ts
import { Component, signal } from "@angular/core";
import { AdaptCellTemplate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
  age: number;
}

@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable, AdaptCellTemplate],
  template: `
    <adapt-data-table
      [data]="people()"
      [columns]="columns"
      [rowKey]="rowKey"
      tableLabel="People"
      [urlSync]="false"
    >
      <ng-template adaptCellTemplate="name" let-value="value">
        <strong>{{ value }}</strong>
      </ng-template>
    </adapt-data-table>
  `,
})
export class PeopleTable {
  readonly people = signal<Person[]>([
    { id: "ada", name: "Ada Lovelace", age: 36 },
    { id: "grace", name: "Grace Hopper", age: 85 },
  ]);
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "age", header: "Age", sortable: true, align: "end" },
  ];
  readonly rowKey = (person: Person) => person.id;
}
```

Import `PeopleTable` into the consuming standalone component's `imports` and
render `<people-table />`. For NG-ZORRO, change only the kit import above to
`@adapttable/ng-zorro` and complete its host setup.

The frontend tier searches, sorts and pages the array. Omit the
`[urlSync]="false"` binding to keep view state in the URL. Several tables
sharing a URL need distinct
`urlKey` values. Narrow screens use cards; `forceMobile` can select that
layout explicitly.

## Add features deliberately

Import a feature from the same kit as the table, create its configuration once
on the component, and bind it through `[features]`:

```ts
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { multiSort } from "@adapttable/angular-unstyled/multi-sort";

const features = [columnMenu(), multiSort()];
```

`standardPreset()` from the kit's `/preset` entry is a convenient larger
composition. See [Features](./features.md) for its exact members and the
individual imports.

## Scaffold from the repository CLI

The implemented CLI recognizes an Angular project when **both** `angular.json`
and an `@angular/core` dependency are present. It supports the
`angular-unstyled` and `ng-zorro` kit choices, and writes a standalone
`PeopleTable` to `src/app/peopleTable.ts`. It does not mount that component in
your app for you. The private kit packages still need to be resolvable in your
development setup; generating a starter does not publish them.

## Data and callbacks

The host owns the rows. Replace the array held by `people` after a successful
write; a renderer does not become your database. For remote data, use
`[onQueryChange]` with host-owned rows, total, loading and error signals, or
pass a prebuilt source through `[source]`.

Callback inputs such as `onQueryChange` and `onRowClick` use square brackets.
Actual outputs such as `(selectionChange)` and `(columnLayoutChange)` use
parentheses. Keep callback functions stable on the component.

Continue with [Data tiers](./data-tiers.md), [Columns](./columns.md),
[Accessibility](./accessibility.md), or the
[Angular API reference](../api.md#the-angular-binding).
