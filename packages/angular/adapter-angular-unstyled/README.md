# @adapttable/angular-unstyled

The Angular AdaptTable drawn with native HTML over
[`@adapttable/angular`](../angular/README.md). It supplies the controls and
responsive table/card layouts; you supply the theme with CSS or Tailwind,
using the shared `data-adapttable-part` names and `classNames` hooks.

**Unpublished workspace package.** `private: true` remains set. The native
kit participates in the kit contracts independently of publication status.

[Angular demo](https://adapttable.orwamahmoud.com/angular/demo/unstyled/) ·
[API reference](https://adapttable.orwamahmoud.com/react/api/#the-angular-native-kit)

## Usage

```ts
import { Component } from "@angular/core";
import { AdaptCellTemplate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";

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

## Opt-in features

Import a feature from its own secondary entry and compose it through the
`features` input. The implemented surface includes:

- Declarative and header filters, AND/OR filter trees, active chips and
  saved views
- Column menus, groups, selection, resizing, multi-sort and fit-to-content
- Row selection, bulk actions, per-row actions, pinning, reordering,
  expanded detail and nested tables
- Grouping, aggregation controls, pivot tables, tree rows and virtualization
- Inline, row and batch editing, validation, save/conflict feedback, dirty
  indicators, undo/redo, keyboard cell navigation, paste and range fill
- Find-in-table, command palette, context menu, side panel and status bar
- Density, fullscreen, CSV/XLSX/PDF export and print
- Opt-in assistant and approval controls on `/assistant`

For example:

```ts
import { editing, dirtyIndicators } from "@adapttable/angular-unstyled/editing";
import { filters } from "@adapttable/angular-unstyled/filters";
import { rowActions } from "@adapttable/angular-unstyled/row-actions";

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
controlling bundle cost.

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

The binding owns structural Chrome, localized labels, focus and keyboard
behavior. This kit fills every required control slot with native HTML.
In particular, `CommandPaletteSlots.Surface` is required: its
`CommandPaletteSurfaceProps` supply the label, dismissal callback, class
and child template. The binding owns the palette's inner structure and
focus model; the native kit owns the actual dialog surface.
