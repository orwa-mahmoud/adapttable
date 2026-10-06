# @adapttable/ng-bootstrap

Requires Node.js **22.22.3+ on Node 22, 24.15.0+ on Node 24, or Node 26+**, matching Angular 22.

Available on npm. Install a compatible binding and kit release together; their
versions are independent and the kit declares its binding/core dependencies.

AdaptTable's Angular binding and structural Chrome, rendered with Bootstrap form
controls and ng-bootstrap overlays. The kit includes scoped Bootstrap 5.3.8 CSS;
loading it does not reset another adapter, the docs, or application navigation.

## Compatibility and setup

- Angular 22 (`@angular/common`, `core`, `forms`, and `localize`)
- ng-bootstrap 21, Popper 2.11.8, and RxJS 7.4 or newer within v7
- Bootstrap CSS 5.3.8 is compiled into the kit's scoped stylesheet

This matches [ng-bootstrap's official compatibility table](https://github.com/ng-bootstrap/ng-bootstrap#dependencies).
Do not import `bootstrap/dist/css/bootstrap.css`, its RTL variant, or Bootstrap's
JavaScript bundle for this adapter. ng-bootstrap owns widget behavior.

Install the kit and its native peers in an Angular 22 app:

```sh
pnpm add @ng-bootstrap/ng-bootstrap@^21 @angular/forms@^22 @angular/localize@^22 @popperjs/core@^2.11.8 rxjs@^7.4
pnpm add @adapttable/ng-bootstrap @adapttable/angular
```

For local source development, link `@adapttable/ng-bootstrap@workspace:*` and
`@adapttable/angular@workspace:*` from this monorepo. AdaptTable package
versions are independent; the adapter resolves its exact binding/core dependencies.

Import the package CSS once in the application entry or global stylesheet pipeline:

```ts
import "@angular/localize/init";
import "@adapttable/ng-bootstrap/styles.css";
```

The CSS is scoped even when loaded globally. It is not sufficient to import Bootstrap's
upstream CSS instead: that would style the whole application. To customize tokens,
set Bootstrap custom properties on `.adapttable-ng-bootstrap`. Pass `theme="dark"`
or `theme="light"` to the table. Standalone exported controls should be placed inside
`<div class="adapttable-ng-bootstrap" data-bs-theme="dark">` (or `light`). Keep their
overlays inside that boundary; no kit overlay is portaled to `document.body`.

## Usage

```ts
import { Component } from "@angular/core";
import { AdaptCellTemplate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-bootstrap";
import { cellNavigation } from "@adapttable/ng-bootstrap/cell-navigation";

interface Person {
  id: string;
  name: string;
  age: number;
}

@Component({
  selector: "people-table",
  imports: [AdaptDataTable, AdaptCellTemplate],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      tableLabel="People"
      [selectable]="true"
    >
      <ng-template adaptCellTemplate="name" let-value="value">
        <strong>{{ value }}</strong>
      </ng-template>
    </adapt-data-table>
  `,
})
export class PeopleTable {
  readonly people: Person[] = [];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", sortable: true },
    { key: "age", sortable: true },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [cellNavigation()];
}
```

Use `data` for in-memory rows, a prebuilt `source`, or `onQueryChange` with
host-fetched rows and `total` for server data. The table never owns the
rows: edits, additions, deletes and reorders call the host.

## Features

Import a feature from its own secondary entry and compose it through the
`features` input. The implemented surface includes:

- **Feature composition** through individual kit subpaths and `standardPreset()`;
  import only the behavior you need
- **Global search, sorting and pagination** for in-memory or host-fetched data,
  with URL-synced state and infinite scrolling on mobile
- **Filtering** with kit-native controls, an AND/OR filter tree,
  header filters, custom filter types, removable chips and saved views
- **Column management** with visibility, ordering, pinning, resizing,
  multi-sort, fit-to-content and collapsible column groups
- **Selection and row actions**, including bulk actions, row expansion and
  nested tables using Angular templates or component renderers
- **Inline cell editing**, row and batch editing, validation, save/conflict
  feedback, dirty indicators, undo/redo and keyboard navigation with paste
  and range fill; writes always go through host callbacks
- **Row reordering and row pinning**, pinned summary rows,
  row and column spanning, full-width and separator rows, plus conditional
  row styling and heights
- **Grouping, aggregation and pivot** controls, tree data with hierarchical
  rows, and row/column virtualization for large tables
- **Spreadsheet formula engine and sparkline columns** through the Angular
  binding's formula and sparkline entries
- **CSV and XLSX export**, PDF export and print layout; custom writers and
  host print callbacks remain opt-in
- **Command palette and view controls**: find-in-table, context menus, side
  panel, density, fullscreen and status bar
- **Responsive mobile cards**, shared localized labels and RTL support;
  custom card renderers retain the selection, editing and action shell
- **Angular SSR and hydration** with deterministic initial data.
  React Server Components are a React-only integration, not an Angular feature
- **Optional assistant and approval controls** on `/assistant`, backed by the
  separately imported AI bindings

For example:

```ts
import { editing, dirtyIndicators } from "@adapttable/ng-bootstrap/editing";
import { filters } from "@adapttable/ng-bootstrap/filters";
import { rowActions } from "@adapttable/ng-bootstrap/row-actions";

const features = [
  filters(),
  editing(saveCell, { onDirtyChange: showUnsavedCount }),
  dirtyIndicators(),
  rowActions(actions, { layout: "menu" }),
];
```

`/features` gathers the kit's feature factories. `/preset` exports
`standardPreset()`: column menu, density, CSV export, fullscreen, header
filters and status bar, with grouping, bulk actions, filters and saved views
included when their options are supplied. Import individual entries when
controlling bundle cost. See the
[Angular feature guide](https://adapttable.orwamahmoud.com/angular/features/)
for the complete entrypoint list and composition rules.

## Mobile cards and custom renderers

The same table switches to cards on narrow screens; `forceMobile` can select
that layout explicitly. Cards retain selection, editable fields, row
editing/actions, tree/detail expansion, reorder controls, row pins and
virtualization. Summary rows stay read-only. Labels come from `TableLabels`,
and `dir="rtl"` sets the reading direction.

`renderCard` replaces a data card's field body without replacing its
interactive shell. Pass an Angular `TemplateRef` or standalone component,
using `MobileCardRenderer`, `MobileCardContext` and `MobileCardField` from
`@adapttable/angular`. The context contains `$implicit` / `row`, `index`,
`selected`, `expanded` and `fields`; a component receives the fields it
declares as inputs.

Each field's `value` is a real Angular template, and `context` is the context
to stamp it with. Rendering that pair preserves the column's cell renderer
and any composed editor. Import `NgTemplateOutlet` into the host component:

```html
<ng-template #cardBody let-fields="fields">
  @for (field of fields; track field.column.key) {
  <div>
    @if (field.label) {
    <span>{{ field.label }}</span>
    }
    <ng-container
      [ngTemplateOutlet]="field.value"
      [ngTemplateOutletContext]="field.context"
    />
  </div>
  }
</ng-template>
<adapt-data-table
  [data]="people"
  [columns]="columns"
  [rowKey]="rowKey"
  [features]="features"
  [renderCard]="cardBody"
/>
```

`renderRowActions` works on desktop rows and cards. Its
`RowActionsRenderer` receives `RowActionsContext`: `$implicit` / `row`,
`actions`, `confirm` and live `labels`. Custom controls must preserve the
supplied actions' disabled/visibility rules and confirmation behavior.

`onRowClick` activates rows and cards by a body click or Enter/Space when the
row itself is focused. Interactive children keep their own behavior;
ArrowUp/ArrowDown move between sibling rows with a roving Tab stop. Summary
rows and cards do not activate.

## Styling and change feedback

The root's `DataTableClassNames` type describes `classNames`:

- Cards: `cards`, `card`, `cardRow`, `cardLabel`, `cardValue`, `cardActions`,
  `cardDetail`, `summaryCard`
- Controls: `checkbox`, `treeToggle`, `treeSpacer`, `rowReorderButtons`,
  `rowReorderUp`, `rowReorderDown`
- Actions on desktop and cards: `actionButton`, `rowActionsMenu`,
  `rowActionsTrigger`
- Structural rows: `separatorRow`, `separatorCell`, `fullWidthRow`,
  `fullWidthCell`, `virtualSpacer`

The hooks supplement the shared part and state attributes. `rowAppearance`
adds per-row/card classes, styles and heights.

Pass `isCellFlashing` a live `(rowId, columnKey) => boolean` reader, such as
`injectChangedCellFlash(...).isFlashing`, to mark desktop cells and the
built-in mobile value wrappers with `data-flash`. Custom card bodies own
their wrappers and can apply that reader themselves.

`editing(saveCell, { onDirtyChange })` tracks unsaved edits and reports a
`DirtyEdits` value on mount and when the set changes: `count`, `confirm`,
`confirmRow` and `confirmAll`. Tracking does not require visible indicators.
Add `dirtyIndicators()` to draw the cell and row/card marks; the host's save
or confirmation clears them, never a timer.

## Kit boundary

The binding owns structural Chrome, localized labels, state and interaction models.
The kit supplies Bootstrap form controls (`form-control`, `form-select`,
`form-check-input`), buttons and tables. ng-bootstrap does not provide separate
button, text-input, checkbox or table components; semantic HTML with Bootstrap's
classes is the upstream-native presentation for those controls.

Overlays use `NgbPopover`, `NgbDropdown`, `NgbOffcanvas` and `NgbModal`; pagination
uses `NgbPagination`, and advanced-filter disclosure uses `NgbCollapse`. The
popover has no backdrop. Drawers and modal sheets have real native backdrops,
focus containment and dismissal. The shared part names stay on their meaningful
control/surface elements. All feature entry points follow the Angular unstyled
feature inventory, including mobile cards, RTL, filtering, editing, grouping,
pivot, tree, row and column operations, saved views, export and optional AI slots.

## Verification

`pnpm styles` regenerates the scoped CSS from the pinned Bootstrap source and
retains its MIT license. `node --test scripts/styles.test.mjs` verifies all emitted
selectors, animation names, theme variables and license metadata. Angular tests
include shared conformance plus native overlay/control regression coverage.
Browser acceptance must check narrow layouts, native overlay placement and focus,
light/dark themes, RTL and switching back to existing kits. Full package and browser
gates must pass on the final integrated release commit.
