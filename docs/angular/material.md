# Angular Material table

Angular Material controls over the headless `@adapttable/angular` binding.
The binding owns state, feature composition, structural Chrome and localized
labels; this kit owns buttons, fields, checkboxes, chips, cards, menus and overlays.

## Availability and compatibility

`@adapttable/angular-material` is available on npm. Keep the kit and
binding releases compatible with the dependencies declared by the kit.

The initial integration targets Angular **22**, Angular Material **22.2.1**
and CDK **22.2.1**. Material requires the same CDK version. Keep Material and
CDK together; AdaptTable packages have independent versions. Node.js must meet
Angular 22's supported floor: 22.22.3+, 24.15.0+, or Node 26+.

Install in an existing Angular 22 application:

```sh
npm install @adapttable/angular-material @adapttable/angular @angular/material@22.2.1 @angular/cdk@22.2.1 @angular/forms@^22 rxjs@^7.8.0
```

The host must also provide compatible `@angular/common`, `@angular/core`,
`@angular/forms`, `@angular/platform-browser` and `rxjs` peers. Use the host's
existing Angular application setup; this adapter does not install a second
Angular runtime or import another adapter. No adapter-specific application
provider is required.

## Styling

Load the host's Angular Material theme and the kit's structural styles once:

```scss
@use "@angular/material" as mat;

html {
  @include mat.theme(
    (
      color: (
        theme-type: light,
        primary: mat.$azure-palette,
      ),
      typography: (
        plain-family: (
          Roboto,
          sans-serif,
        ),
      ),
      density: 0,
    )
  );
}

html.dark {
  @include mat.theme(
    (
      color: (
        theme-type: dark,
        primary: mat.$azure-palette,
      ),
    )
  );
}
```

```css
@import "@angular/cdk/overlay-prebuilt.css";
@import "@adapttable/angular-material/styles.css";
```

Import CSS after the theme in the application's global style entry. The kit
styles are scoped to `.adapt-material` and `.adapt-material-overlay`; they do
not reset the page or choose a global theme. For locally scoped themes, include
`.adapt-material-overlay` in the same theme because Material/CDK portals mount
outside the table. The showcase demonstrates isolated light/dark themes.

Use Material's density theme configuration to change control density. The
table's `density` input also adjusts cell spacing. `classNames` hooks remain
available for application-specific customization.

## Minimal table

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-material";
import { filters } from "@adapttable/angular-material/filters";
import { columnMenu } from "@adapttable/angular-material/column-menu";

interface Person {
  id: string;
  name: string;
  team: string;
}

@Component({
  selector: "people-table",
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="people"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features"
    tableLabel="People"
    [selectable]="true"
  />`,
})
export class PeopleTable {
  readonly people: Person[] = [{ id: "1", name: "Ada", team: "Research" }];
  readonly rowKey = (person: Person) => person.id;
  readonly columns: ColumnDef<Person>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (row) => row.name,
      sortable: true,
    },
    { key: "team", header: "Team", accessor: (row) => row.team },
  ];
  readonly features = [
    filters<Person>([{ key: "name", type: "text" }]),
    columnMenu(),
  ];
}
```

Import only needed feature entries, or use `/features` and `/preset` for the
aggregated factories and `standardPreset()`. Omitting a feature renders no
controls for it. All edits, row operations and assistant actions remain host
callbacks; the table never owns or mutates the application data.

## Supported feature inventory

The kit implements the same applicable inventory as Angular unstyled:

- Global search, sorting, multi-sort, pagination, frontend and remote data,
  infinite loading, status and error states, URL-synced query state
- Text, boolean, choice, multi-choice, checklist, number/date range and custom
  filters; nested AND/OR builder, header filters, removable chips and saved views
- Column visibility, ordering, pinning, resizing, fit-to-content, header rename,
  collapsible column groups and whole-column selection
- Row selection, bulk actions, row actions, expansion, nested tables,
  row reorder, move confirmation, row pinning and pinned summary rows
- Inline, row and batch editing; boolean, text, number, date and select editors;
  validation, dirty/save/conflict state, undo/redo, keyboard navigation, paste,
  range selection and fill; writes go through the existing host callbacks
- Grouping, aggregation, grouping panel, pivot configuration and pivot tables;
  tree rows, row/column virtualization, cell spanning, full-width/separator rows,
  row appearance and conditional row heights
- CSV/XLSX/PDF export, print, fullscreen, density, find-in-table, command palette,
  context menu, side panels and selection/status statistics
- Responsive mobile cards, custom cell/card/action templates and component
  renderers, all bundled locales, RTL, accessible labels and announcements
- Optional `/assistant` controls, agent approval, dictation-language selection
  and example menus using the separately imported AI bindings
- Formula and sparkline integration through the Angular binding, SSR and hydration

React Server Components are not an Angular integration. No Angular feature is
silently replaced with a React kit or native-HTML fallback.

## Native component mapping

- Buttons: `MatButton`; text, number, date and search fields: `MatInput` in
  `MatFormField`; native choice controls: Material's `matNativeControl` in
  `MatFormField`; multi-choice header controls: `MatSelect`
- Selection and boolean controls: `MatCheckbox`, with binding refs and semantic
  part names attached to the real input; tree disclosure: `MatExpansionPanel`
- Active-filter tokens: `MatChip`; mobile rows and assistant panels: `MatCard`
- Row-action and assistant-example menus: `MatMenu`; filter cards, column/view
  controls, header filters, context and row-move menus: CDK connected overlays
  containing Material surfaces
- Filter drawer, command palette and assistant sheet: `MatDialog`, with its
  native backdrop, focus containment, Escape handling and opener restoration

Structural HTML tables retain the binding's semantic table/grid contract,
virtual rows, pinned cells and feature slots. Replacing the engine with a
second `MatTableDataSource` would duplicate sorting/filtering state, so it is
not used. Material themes provide colors, typography and interactive controls.

Filter popovers intentionally have **no backdrop**. They dismiss on outside
click and Escape, restoring the trigger on Escape. Modal drawers have a real
Material backdrop. RTL reaches the overlay content and positioning. Mobile
cards preserve the editing, selection, detail, tree and action shell when a
custom body renderer is supplied.

## Verification

The package carries the Angular conformance driver and feature regression
suites, plus Material-specific control and overlay tests. Full package gates,
coverage and browser acceptance must pass on the final integrated commit;
source-level checks alone are not a release-readiness claim.

[Angular binding guide](https://adapttable.orwamahmoud.com/angular/getting-started/)
· [Tracked implementation](https://github.com/orwa-mahmoud/adapttable/issues/467)
