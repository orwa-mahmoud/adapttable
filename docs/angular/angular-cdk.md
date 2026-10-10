# Angular CDK adapter

`@adapttable/angular-cdk` is an Angular 22 adapter based on MIT-licensed
`@angular/cdk` 22.2.1. The kit is available on npm.
Keep the kit and binding releases compatible with their declared dependencies.

CDK provides accessibility and overlay primitives, not a visual component theme.
This adapter owns neutral controls, styles, table/card layouts and all required
slots over Angular binding Chrome. It does not import Angular Material or any
other adapter. FocusMonitor enhances the controls; connected overlays, CDK Menu
and focus traps power popovers, menus and modal drawers/dialogs.

Import global `@angular/cdk/overlay-prebuilt.css` before
`@adapttable/angular-cdk/styles.css`. No external assets or license key are needed.
Customize the neutral palette through `--adapt-cdk-accent`, `--adapt-cdk-border`,
`--adapt-cdk-background` and `--adapt-cdk-color`. Shared part names and class hooks
remain available on the same public elements.

## Minimal table

Install in an existing Angular 22 application:

```sh
npm install @adapttable/angular-cdk @adapttable/angular @angular/cdk@22.2.1 @angular/forms@^22 rxjs@^7.8.2
```

Keep the host's Angular Common, Core and Platform Browser packages on compatible
Angular 22 versions. Load these imports in the application's global stylesheet:

```css
@import "@angular/cdk/overlay-prebuilt.css";
@import "@adapttable/angular-cdk/styles.css";
```

The adapter does not require a kit-specific application provider. Import its
standalone table and opt into its own CDK-backed filter controls:

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-cdk";
import { filters } from "@adapttable/angular-cdk/filters";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
      tableLabel="People"
    />
  `,
})
export class PeopleTable {
  readonly people: Person[] = [{ id: "1", name: "Ada" }];
  readonly columns: ColumnDef<Person>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
      sortable: true,
    },
  ];
  readonly rowKey = (person: Person) => person.id;
  readonly features = [filters<Person>([{ key: "name", type: "text" }])];
}
```

The rows remain host-owned. This example turns URL synchronization off; see the
[URL state guide](./url-state.md) when connecting the table to application routes.

## Feature surface

The implementation includes the full 40-entry feature surface, the optional
assistant, desktop and responsive mobile cards, RTL, SSR fixtures and host-owned
writes. Filters use an anchored, backdrop-free card by default; drawer mode
blocks the background and traps focus. Individual feature imports remain opt-in.

The implementation and its focused CDK fixtures require integrated Angular 22
compiler, coverage and browser verification before any release claim.
