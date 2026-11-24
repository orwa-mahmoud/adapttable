# Angular row selection and bulk actions

Compose `selection()` from the kit's `/selection` entry to add row checkboxes.
Selection uses stable row IDs, so replacing an object with another object
having the same ID does not change which record is selected.

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { selection } from "@adapttable/angular-unstyled/selection";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "app-select-people",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
    />
    <p>{{ selectedIds().length }} selected</p>
  `,
})
export class SelectPeople {
  readonly rows: Person[] = [
    { id: "ada", name: "Ada" },
    { id: "grace", name: "Grace" },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly selectedIds = signal<readonly string[]>([]);
  readonly features = [
    selection({
      selectedIds: this.selectedIds,
      onSelectionChange: (ids) => {
        this.selectedIds.set(ids);
      },
    }),
  ];
}
```

`selection()` takes `SelectionOptions`. `onSelectionChange` receives the
complete `string[]` of selected IDs. Omit `selectedIds` for table-owned
selection, or pass `defaultSelectedIds` to start that selection. `getId`
selects by an id other than the row key. When you supply `selectedIds`,
update the signal from `onSelectionChange`: the rendered selection is always
the value the host supplies.

The NG-ZORRO kit publishes the same `selection()` entry. Replace the root
kit import with `@adapttable/ng-zorro`; see [getting started](./getting-started.md)
for package installation and first-release status.

## Bulk actions and all matching rows

Import `bulkActions` from the kit's `/bulk-actions` entry and compose
`bulkActions(actions)`. This enables row selection and displays the action
bar while IDs are selected. Each `BulkAction` has a `key`, translated
`label`, `onClick(ids, context)`, optional `disabledReason(ids)` and optional
`confirm` request.

The header checkbox selects or clears the current source rows, with an
indeterminate state when only some are selected. When the whole page is
selected and more rows match, the bar can offer “select all matching.” That
does not download or enumerate the other IDs: the callback still receives
the explicit IDs and `context.allMatching: true`, with `context.total` for
the matching count. The host must apply that action to the entire filtered
set using its current query. Never treat `ids` as the full set in this mode.

Bulk callbacks may return promises. The bar shows pending state, catches a
rejection and displays its message, and clears selection only after a
successful run. A nonempty `disabledReason` disables the action and explains
why. Confirmation uses the table's `[confirm]` callback or the browser
confirmation fallback; the count reflects the requested scope.

## Keyboard, cards and headless use

Desktop checkboxes and mobile-card checkboxes have localized accessible
names and native keyboard behavior. Actions use the kit's buttons. Changing
an individual selection narrows an all-matching scope back to explicit IDs.
Selection is not serialized to the URL or saved views; persist it in the
host if the workflow requires it across table mounts.

For a custom shell, `injectRowSelection` accepts a rows signal, `rowKey`, an
optional selected-ID signal and `onSelectionChange`. It returns signals such
as `selectedIds()`, `selectedCount()` and `headerState()`, plus `toggle`,
`toggleAll`, `replace`, `clear` and checkbox attributes. Pass it into
`injectDataTable`'s `selection` option.

Column selection is a separate cell-range interaction:
`columnSelectionCheckbox()` from `/column-selection` requires
`cellNavigation()` and does not select row IDs. See
[cell navigation](./cell-navigation.md), [row actions](./row-actions.md) and
[accessibility](./accessibility.md).
