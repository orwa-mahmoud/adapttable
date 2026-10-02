# Angular cell navigation

`cellNavigation()` turns the desktop table into a keyboard grid with one active
cell, range selection, clipboard actions and optional fill. Compose it from the
same kit as `AdaptDataTable`. The kits are private workspace packages; the
[getting-started guide](./getting-started.md) describes their current status.

## Observe the selected rectangle

```ts
import { Component, signal } from "@angular/core";
import type { CellRange, ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import { selectionStats } from "@adapttable/angular-unstyled/selection-stats";
import { statusBar } from "@adapttable/angular-unstyled/status-bar";

interface Sale {
  id: string;
  product: string;
  amount: number;
}

@Component({
  selector: "app-sales-grid",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Sales"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
    <p role="status">{{ range() ? "Cell range selected" : "No cell range" }}</p>
  `,
})
export class SalesGrid {
  readonly rows: readonly Sale[] = [
    { id: "s1", product: "Notebook", amount: 12 },
    { id: "s2", product: "Pencil", amount: 3 },
  ];
  readonly columns: readonly ColumnDef<Sale>[] = [
    { key: "product", header: "Product" },
    { key: "amount", header: "Amount" },
  ];
  readonly rowKey = (row: Sale) => row.id;
  readonly range = signal<CellRange | null>(null);
  readonly features = [
    cellNavigation({ onRangeChange: (range) => this.range.set(range) }),
    selectionStats(),
    statusBar(),
  ];
}
```

For NG-ZORRO, replace the three feature prefixes and the root component import
with `@adapttable/ng-zorro`. `onRangeChange` is a callback inside the factory
options. Its value is a rectangle with `anchor` and `head` coordinates, or
`null` when the selection clears. It is separate from selected row IDs.
The direct `[cellNavigation]="true"` input also enables grid navigation; the
factory is useful when composing the rest of the grid features.

## Keyboard and clipboard

Tab enters the grid at its active cell. Arrow keys move the active cell and
Shift extends a rectangle. The grid manages focus and announces its position;
native inputs keep their own editing keys while an editor is active. Clipboard
copy uses tab-separated cells and newline-separated rows, so a rectangle can be
pasted into a spreadsheet. Cmd/Ctrl+C copies, and a failed clipboard write is
announced instead of being reported as successful.

Paste and fill require editable columns and a host edit callback. Compose
[`editing()`](./cell-editing.md); Cmd/Ctrl+V then parses clipboard cells through
the editing contract and asks the host to write them. Cmd/Ctrl+D fills down;
the selection-corner handle also previews a drag-fill. A read-only grid does
not intercept paste/fill as if it could save. With edit history, a multi-cell
gesture becomes one undo step.

`onCellCut` is an optional callback input on the table. It receives the range
after copying succeeds; your host decides how to clear the underlying values.
The context-menu Cut action is offered only when that callback is wired. Copy
permission and write permission are distinct: successful copying does not
authorize a data mutation.

Browser clipboard availability and permissions vary. Keep a usable selection
and a visible error path when the Clipboard API rejects; do not promise that a
keyboard shortcut can bypass the browser's permission checks.

## Ranges and layout

Ranges use the rendered grid's row and column order. Sorting, pagination,
hidden columns and virtual windows must be interpreted through the table's
model; do not use rectangle coordinates as permanent record identifiers.
Export with `scope: "range"` uses the selected rectangle's columns, including
when the current page is not page one.

The mobile layout is a list of cards rather than a rectangular spreadsheet.
Keep editing and row actions usable there, and offer a touch-accessible toolbar
for commands that would otherwise be keyboard-only. `selectionStats()` needs a
cell range; it is not a replacement for row-selection totals.

See [Selection](./selection.md), [Exporting](./exporting.md),
[Virtualization](./virtualization.md) and [Accessibility](./accessibility.md).
The [grid focus tests](../../packages/angular/angular/src/focus/gridFocus.test.ts)
cover host writes, copy failure, fill and read-only behavior.
