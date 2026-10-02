# Angular row pinning

`rowPinning()` adds Pin to top, Pin to bottom and Unpin actions. A pinned
data row moves out of the scrolling section into its chosen edge while
remaining the same record with the same identity.

This example holds the pin state in a host signal, so both row-menu actions
and host buttons update the same live lists:

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef, RowPinState } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "app-pinned-people",
  imports: [AdaptDataTable],
  template: `
    <button type="button" (click)="pinAda()">Pin Ada to top</button>
    <button type="button" (click)="clearPins()">Unpin all</button>
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [maxHeight]="320"
      urlKey="people"
    />
  `,
})
export class PinnedPeople {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada" },
    { id: "grace", name: "Grace" },
    { id: "alan", name: "Alan" },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly pinnedRowIds = signal<RowPinState>({ top: [], bottom: [] });
  readonly features = [
    rowPinning({
      pinnedRowIds: this.pinnedRowIds,
      onPinnedRowIdsChange: (next) => this.pinnedRowIds.set(next),
    }),
  ];

  pinAda(): void {
    this.pinnedRowIds.set({ top: ["ada"], bottom: [] });
  }

  clearPins(): void {
    this.pinnedRowIds.set({ top: [], bottom: [] });
  }
}
```

The NG-ZORRO equivalent imports its table from `@adapttable/ng-zorro` and
the feature from `@adapttable/ng-zorro/row-pinning`.
See [getting started](./getting-started.md) for installation
and first-release status.

## Which rows can be pinned

The feature partitions rows available from the current source. It does not
fetch a row because its ID appears in pin state, or make a filtered-out
record bypass the source's filtering. Stable IDs let the same pin state
apply when that record is available again.

Pinned data rows keep their row controls. Selection, detail expansion and
actions still address the original ID. The desktop scroll box gives pins
sticky placement; mobile cards preserve top/body/bottom order and offer
the same pin actions. Pin labels come from `[labels]`; `dir` governs the
action layout without changing top versus bottom.

Data-row pinning is refused while grouping or a tree is active, with a
development warning. For totals that must stay visible in a grouped or tree
table, use [pinned summary rows](./pinned-summary-rows.md), which are separate
host-supplied records.

## URL and host control

Uncontrolled `rowPinning()` stores `{ top: string[], bottom: string[] }`
and writes it to the `rowPin` URL slice. `urlKey` namespaces that slice;
`[urlSync]="false"` keeps the table's state in memory. Saved views capture
the same slice.

To observe changes without taking control, pass
`onPinnedRowIdsChange(next)` in the factory options and leave
`pinnedRowIds` absent. Supplying `pinnedRowIds` makes those lists the
authority and disables the feature's automatic URL persistence. A callback
then requests a new value from the host instead of mutating the supplied
lists.

`RowPinningFeatureOptions.pinnedRowIds` accepts `MaybeSignal<RowPinState>`:
a state object or an Angular signal of one. Both kit shells follow that
signal after mounting. In the example, row-menu actions request the next
lists through `onPinnedRowIdsChange`, and the host writes them with
`signal.set`. The host's buttons write the same signal directly. Pass
`this.pinnedRowIds`, not the snapshot `this.pinnedRowIds()`, and keep the
feature declaration stable. Clearing both lists unpins every row. A fixed
state object is controlled too and will not change just because a pin
action was requested.

For host-controlled state that also persists, import
`injectRowPinningUrlState` from `@adapttable/angular`. In the component's
injection context, create a `pins` field with
`injectRowPinningUrlState({ urlKey: "people" })`, using the table's namespace.
Pass `this.pins.pinnedRowIds` as the feature's `pinnedRowIds` and
`this.pins.onPinnedRowIdsChange` as its change callback. This replaces the
example's in-memory signal; host controls then write through
`this.pins.onPinnedRowIdsChange(next)`. In a custom shell, `injectRowPinning`
provides the lower-level signal controller.

## Styling and related features

Pinned data rows carry `pinned-top` or `pinned-bottom` parts and a
`data-row-pin` side. They can use [row appearance](./row-styling.md), and
extras targeting their ID travel with that row. Do not confuse these pins
with column pins or host totals.

See [column management](./column-management.md),
[full-width rows](./full-width-rows.md), [URL state](./url-state.md) and
[saved views](./saved-views.md).
