# Angular toolbar and view controls

The table's search and pagination work without a preset. Additional controls are
opt-in features from the selected kit: density, fullscreen, export, saved
views, commands and printing. Each contributes its own controls to the toolbar
or status area, using native HTML in the unstyled kit and NG-ZORRO in that kit.

## Compose only the controls you need

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { densityChooser } from "@adapttable/angular-unstyled/density";
import { fullscreen } from "@adapttable/angular-unstyled/fullscreen";
import { statusBar } from "@adapttable/angular-unstyled/status-bar";
import { commandPalette } from "@adapttable/angular-unstyled/command-palette";
import { print } from "@adapttable/angular-unstyled/print";

interface Order {
  id: string;
  customer: string;
}

@Component({
  selector: "app-orders-toolbar",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Orders"
      urlKey="orders"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class OrdersToolbar {
  readonly rows: readonly Order[] = [{ id: "o1", customer: "Ada" }];
  readonly columns: readonly ColumnDef<Order>[] = [
    { key: "customer", header: "Customer" },
  ];
  readonly rowKey = (row: Order) => row.id;
  readonly features = [
    densityChooser(),
    fullscreen(),
    statusBar(),
    commandPalette({ button: true }),
    print(() => window.print(), true),
  ];
}
```

The `window.print()` call runs on a user action, not during server rendering.
The callback owns the print behavior; pass `true` as the second argument to
show its toolbar button. Without it, the print action can still be offered in
the command palette.

For NG-ZORRO, change all kit imports together to `@adapttable/ng-zorro`.
See [getting started](./getting-started.md) for installation
and first-release status.

## Preset and individual entries

`standardPreset()` from your kit's `/preset` returns these six features:
`columnMenu`, `densityChooser`, `exportCsv`, `fullscreen`, `headerFilters` and
`statusBar`. Its optional `grouping`, `bulkActions`, `filters` and `savedViews`
arguments add configured features. It does not automatically include cell
editing, virtualization, a command palette or every separately available
feature.

The result is an ordinary array. Import individual entries when a small import
graph matters. Angular's kit `/features` entry aggregates kit factories; it is
not React's headless feature aggregate.

## State, focus and browser support

- Density switches between comfortable and compact. The choice participates
  in URL state; use a distinct `urlKey` for independent tables
- Fullscreen is available where the browser supports it and requires a real
  user gesture. The state follows the document, including the browser's Escape
  action; a refused request does not mean the table entered fullscreen
- Saved views record supported table state. Pair their persistence options
  with your host's storage and permission model
- The views popover closes on Escape and returns focus to its trigger. Keep
  visible controls reachable on narrow screens instead of relying on a shortcut
- `[labels]` supplies localized captions and `[dir]` supplies direction. The
  kit shell does not have a `locale` input

`sidePanel()` from `/side-panel` accepts named panels and a controlled `open`
key or `null`, plus `onOpenChange`. Panel content can be a template or plain
text. Keep the current key in an Angular signal and provide a computed feature
array when those options change. The panel's side is logical start/end, so it
can follow RTL. See [Customization](./customization.md) for Angular templates.

For edit history, compose `editHistory()` and `undoRedoButtons()` from
`/editing`; the buttons rely on host write callbacks and do not persist rows
themselves. Export progress, errors and retry actions belong to the export
controller, not an application timer pretending a download completed.

See [Saved views](./saved-views.md), [Command palette](./command-palette.md),
[Exporting](./exporting.md), [Cell editing](./cell-editing.md) and
[URL state](./url-state.md). The [toolbar tests](../../packages/angular/adapter-angular-unstyled/src/toolbar.test.ts)
exercise density, fullscreen, export and Escape focus restoration.

When `[density]` is supplied, it is a live controlled value. The chooser emits
`(densityChange)` and waits for the host to update the input; without a supplied
value it keeps its own URL/local state. A host can observe `(densityChange)` in
either mode.
