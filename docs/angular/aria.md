# Angular Aria adapter

`@adapttable/angular-aria` targets Angular 22 and the MIT-licensed Angular
Aria/CDK 22.2.1 pair. It is being prepared for its first public **0.1.0** release.
Registry installation requires the owner-controlled npm publication to complete;
release preparation does not confirm npm availability.

## Architecture and controls

The adapter fills the Angular binding's required Chrome slots. Aria toolbar
and toolbar-widget directives provide pager navigation; Aria menu/menu-item
directives serve context and row-action menus. Filter-tree choices use Aria
combobox/listbox/option directives, and advanced filters use its accordion.
CDK positions filter and choice popups; its focus trap supports the drawer.

Angular Aria supplies accessible composite behavior, not a visual theme or
standalone button, input, checkbox or dialog components. These controls and
remaining surfaces are deliberately adapter-owned, neutrally styled native
HTML. There are no Material components and no imports from another kit.
Table navigation remains in the binding; no Aria grid integration is claimed.

Import `@angular/cdk/overlay-prebuilt.css` and
`@adapttable/angular-aria/styles.css` in the host. Override `--adapt-aria-*`
tokens or use the common part attributes and class-name hooks.

## Minimal table

After publication completes, install in an existing Angular 22 application:

```sh
npm install @adapttable/angular-aria@0.1.0 @adapttable/angular @angular/aria@22.2.1 @angular/cdk@22.2.1 @angular/forms@^22 rxjs@^7.8.2
```

Keep the host's Angular Common, Core and Platform Browser packages on compatible
Angular 22 versions. Aria and CDK must stay on their matching 22.2.1 versions.
No kit-specific application provider is required. Add these imports to the
host's global stylesheet:

```css
@import "@angular/cdk/overlay-prebuilt.css";
@import "@adapttable/angular-aria/styles.css";
```

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-aria";
import { filters } from "@adapttable/angular-aria/filters";

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

The table uses this adapter's controls on desktop and mobile. The example keeps
URL state local; see [URL state](./url-state.md) to connect application routes.

## Feature surface

Compose opt-in features from the package's secondary entries, including
filters, editing, grouping, pivot, tree, selection, saved views, exports,
virtualization, row actions, command palette and assistant. Model and URL
state belong to core through the Angular binding. The adapter never owns row
data; host callbacks perform writes.

Desktop tables and mobile cards share the adapter controls. Logical CSS and
localized binding labels support RTL. Aria composites own their keyboard
interactions; the binding owns table navigation and screen-reader messages.

## Verification and release status

The source includes Angular TestBed directive fixtures and the shared adapter
behavior suite. The release must pass the integrated Angular compiler,
coverage, package build and real-browser keyboard/overlay checks before it is
called release-ready. A workspace manifest or showcase route is not evidence
of npm publication.

See the [package README](https://github.com/orwa-mahmoud/adapttable/tree/main/packages/angular/adapter-angular-aria)
for usage, feature entries, styling hooks and the precise primitive mapping.
