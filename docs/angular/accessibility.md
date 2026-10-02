# Accessible Angular tables and keyboard grids

Both Angular kits preserve semantic table or card-list structure, localized
control names, focus behavior and live announcements. Give every table a
specific `tableLabel`, especially when a page contains several tables.
Custom cells and surrounding application controls remain part of the
accessibility work.

## Add keyboard cell navigation

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import { columnSelectionCheckbox } from "@adapttable/angular-unstyled/column-selection";

interface Person {
  id: string;
  name: string;
  team: string;
}

@Component({
  selector: "accessible-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      tableLabel="People keyboard grid"
    />
  `,
})
export class AccessiblePeopleTable {
  readonly people: Person[] = [
    { id: "ada", name: "Ada", team: "Research" },
    { id: "grace", name: "Grace", team: "Engineering" },
  ];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "team", header: "Team", sortable: true },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [cellNavigation(), columnSelectionCheckbox()];
}
```

The NG-ZORRO equivalents live under `@adapttable/ng-zorro`. The grid is opt-in;
a plain data table does not need to make every cell a Tab stop.
`columnSelectionCheckbox()` requires cell navigation and selects a column's
cell range. `[selectable]="true"` separately enables row selection.

## Keyboard behavior

With the keyboard grid composed, one cell is the roving Tab stop. Arrow keys
move focus through cells; Home/End reach the row's ends, Ctrl/Cmd+Home/End
reach the grid's ends, and PageUp/PageDown move by a viewport-sized step.
Shift with movement extends the range where supported. RTL reverses the
visual horizontal movement while preserving logical row start/end.

Sorting, column disclosures and checkboxes remain real focusable controls.
With `[onRowClick]`, a focused row or card activates on Enter/Space, and
ArrowUp/ArrowDown navigate sibling rows. Interactive descendants retain their
own behavior, so activating a checkbox must not also activate its row.

Filter popovers and drawers preserve Escape behavior and focus restoration.
An open nested select closes before its parent overlay. Reorder controls
provide keyboard actions; menus and dialogs need both an accessible name and
a reachable dismissal action. Custom renderers must retain those behaviors.

See [Cell navigation](./cell-navigation.md), [Cell editing](./cell-editing.md)
and [Row reordering](./row-reordering.md) for their additional interactions.

## Announcements and async state

The table's permanent polite live region announces meaningful changes to sort,
row count and visible range after they settle. It is present before there is
anything to say. Optional grid, reorder, editing and export behavior provide
their corresponding announcements rather than requiring a user to infer
changes from color or motion.

First-load skeletons, empty data, no matching results, background refresh and
fetch errors are different states. Keep them distinguishable and keep retry
operable when it is offered. A custom headless shell renders
`AdaptTableStatusAnnouncer` with `table.statusAnnouncement()` and handles the
source's error/loading state explicitly.

## Cards, virtualization and custom content

Mobile cards form a named list with labeled fields and row position
information. Keep this semantic structure when replacing the card body. Stamp
each `MobileCardField` template with its context so composed editors remain
available; see [Mobile cards](./mobile.md).

Virtualized rows still need their actual position and dataset size; do not
replace them with indexes starting at zero for every window. Use the binding's
focus and attribute helpers to reach cells outside the current window.
The source determines which remote rows are available; keyboard navigation
cannot invent unloaded server data.

For custom cells, provide names for icon-only buttons, text alternatives for
charts and statuses, meaningful field labels, visible focus and sufficient
contrast. Do not place unrelated interactive controls inside a sort button.
Honor reduced-motion preferences for changed-cell animations.

## Check the rendered experience

Test the actual kit in both table and card layouts with keyboard-only input,
RTL, zoom and long localized labels. Verify that focus remains visible after
sorting, paging and deleting/reordering a row, and that a screen reader hears
the resulting state once. Automated accessibility checks are useful, but a
static ARIA attribute check does not prove focus or announcement behavior.

When building an adapter, bind whole `AdaptAttrs` records to the semantic
element, including controlled properties, events and refs. Required Chrome
slots must use the kit's accessible controls; see
[Building an adapter](./building-an-adapter.md),
[Headless rendering](./headless.md) and [Localization](./i18n-rtl.md).
