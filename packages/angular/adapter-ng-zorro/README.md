# @adapttable/ng-zorro

The Angular AdaptTable rendered with NG-ZORRO components over the headless
[`@adapttable/angular`](../angular/README.md) binding. Tables, cards, inputs,
selects, checkboxes, buttons and overlays use `ng-zorro-antd`; the binding
owns state, structure, keyboard behavior and localized labels.

**Unpublished workspace package.** The package remains `private: true` at
version `0.0.0`. It participates in the shell-kit contracts; publication
and its first release are separate decisions.

[NG-ZORRO demo](https://adapttable.orwamahmoud.com/angular/demo/ng-zorro/) ·
[API reference](https://adapttable.orwamahmoud.com/react/api/#the-angular-ng-zorro-kit)

## Host setup

This kit targets Angular 22 and NG-ZORRO 22.1.1. Its peer dependencies are
`@angular/cdk`, `@angular/common`, `@angular/core`, `@angular/forms`,
`@angular/platform-browser`, `@angular/router` and `ng-zorro-antd`.
It imports its AdaptTable contracts only through `@adapttable/angular`.

Load NG-ZORRO's global stylesheet once in the host application, for example
from its global CSS entry:

```css
@import "ng-zorro-antd/ng-zorro-antd.min.css";
```

The kit does not inject a theme stylesheet or import another AdaptTable kit.
Use the host application's NG-ZORRO theme and the shared `classNames` hooks
for customization.

## Usage

```ts
import { Component } from "@angular/core";
import { AdaptCellTemplate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";

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

Supply in-memory `data`, a prebuilt `source`, or host-fetched rows with
`onQueryChange` and `total`. Edits, additions, deletes and reorders call the
host; the table never owns or mutates its rows. The binding also owns sorting,
pagination and virtualization, so the NG-ZORRO table does not run a second
data pipeline.

## Opt-in features

Import each feature from this kit's own secondary entry and compose it
through the `features` input:

```ts
import { editing, dirtyIndicators } from "@adapttable/ng-zorro/editing";
import { filters } from "@adapttable/ng-zorro/filters";
import { rowActions } from "@adapttable/ng-zorro/row-actions";

const features = [
  filters(),
  editing(saveCell, { onDirtyChange: showUnsavedCount }),
  dirtyIndicators(),
  rowActions(actions, { layout: "menu" }),
];
```

The feature entries cover:

- Declarative and header filters, AND/OR filter trees, active chips and
  saved views
- Column menus, groups, selection, resizing, multi-sort and fit-to-content
- Row selection, bulk and row actions, pinning, reordering, expanded detail
  and nested tables
- Grouping and aggregation controls, pivot tables, tree rows and virtualization
- Inline, row and batch editing, validation, save/conflict feedback, dirty
  indicators, undo/redo, keyboard cell navigation, paste and range fill
- Find-in-table, command palette, context menu, side panel and status bar
- Density, fullscreen, CSV/XLSX/PDF export and print
- Opt-in assistant and approval controls on `/assistant`

`/features` gathers the feature factories. `/preset` exports
`standardPreset()`: column menu, density, CSV export, fullscreen, header
filters and status bar, with grouping, bulk actions, filters and saved views
included when their options are supplied. Import individual entries when
controlling bundle cost.

The assistant is optional. `tableAssistant()` and `agentApproval()` from
`@adapttable/ng-zorro/assistant` compose the kit's cards, drawer, composer
and approval buttons. AI state and protocols remain in the separately
imported `@adapttable/ai-angular` and `@adapttable/ai` packages.

## Responsive layouts and rendering

Narrow screens use NG-ZORRO cards; `forceMobile` can select them explicitly.
Cards retain selection, editing, row actions, tree/detail expansion,
reordering, pinned rows and virtualization. Summary rows remain read-only.
Labels come from `TableLabels`, and `dir="rtl"` also reaches portalled menus
and filter controls.

`renderCard` replaces a data card's field body while preserving its
interactive shell. Pass a `MobileCardRenderer` from `@adapttable/angular`:
an Angular template or standalone component receiving `MobileCardContext`.
Each `MobileCardField` supplies a `value` template and its `context`; render
them together with `NgTemplateOutlet` to retain the column's renderer and
composed editor. `renderRowActions` receives `RowActionsContext` on desktop
and cards; custom actions must preserve visibility, disabled state and the
supplied confirmation behavior.

`onRowClick` responds to a body click or Enter/Space when the row itself has
focus. Interactive children keep their own behavior; ArrowUp/ArrowDown move
between sibling rows with a roving Tab stop. Summary rows do not activate.

## Styling, overlays and feedback

`DataTableClassNames` describes the root `classNames` input. Its card,
checkbox, tree, row-action, reorder and structural-row hooks supplement the
shared shell `data-adapttable-part` and state attributes. `rowAppearance`
adds per-row/card classes, styles and heights. NG-ZORRO owns its component
internals; native-only unstyled-kit parts are not this kit's styling API.

`filtersMode="popover"` uses an anchored NG-ZORRO popover without a backdrop.
Escape and outside clicks close it, the trigger exposes `aria-expanded`, and
Escape restores trigger focus. Selecting an option inside a nested select
keeps the parent panel open; Escape closes the nested control first.
`filtersMode="drawer"` uses a real NG-ZORRO drawer and backdrop. The command
palette fills the binding's required Surface slot with an NG-ZORRO modal.

`isCellFlashing(rowId, columnKey)` marks desktop cells and the built-in mobile
value wrappers with `data-flash`. Custom card bodies own their wrappers.
`editing(saveCell, { onDirtyChange })` reports unsaved edits independently of
whether `dirtyIndicators()` is composed. The host's save or confirmation
clears them, never a timer.

## Kit boundary

The kit fills required Angular Chrome slots with NG-ZORRO controls and uses
the binding's `AdaptAttrs` target bridge for the underlying semantic table
and focusable controls. It preserves whole prop records, classes, ARIA,
events and refs instead of copying a subset onto a component wrapper.
There are no raw-control fallbacks and no dependency on the unstyled kit.
