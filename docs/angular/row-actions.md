# Angular row actions

`rowActions()` adds a trailing actions column and the same controls on each
mobile card. The table asks the host to act; it never edits, copies or
deletes the host's data itself.

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef, RowAction } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { rowActions } from "@adapttable/angular-unstyled/row-actions";

interface Person {
  id: string;
  name: string;
  locked?: boolean;
}

@Component({
  selector: "app-row-actions",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
    />
    @if (inspected(); as person) {
      <p>Selected record: {{ person.name }}</p>
    }
  `,
})
export class RowActions {
  readonly rows = signal<Person[]>([
    { id: "ada", name: "Ada" },
    { id: "grace", name: "Grace", locked: true },
  ]);
  readonly inspected = signal<Person | undefined>(undefined);
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly actions: RowAction<Person>[] = [
    {
      key: "inspect",
      label: "Inspect",
      onClick: (row) => this.inspected.set(row),
      disabledReason: (row) =>
        row.locked ? "This record is locked" : undefined,
    },
  ];
  readonly features = [
    rowActions(this.actions, {
      layout: "menu",
      onDuplicateRow: (row) =>
        this.rows.update((rows) => [
          ...rows,
          { ...row, id: crypto.randomUUID(), name: `${row.name} copy` },
        ]),
      onDeleteRow: (row) =>
        this.rows.update((rows) =>
          rows.filter((candidate) => candidate.id !== row.id)
        ),
    }),
  ];
}
```

Both kit imports can use `@adapttable/ng-zorro` instead. These are workspace
packages; consult [getting started](./getting-started.md) before setup.

## Actions and mutations

The default `layout` is `"buttons"`; `"menu"` groups actions behind one
control. `isHidden(row)` removes an inapplicable action. `isDisabled(row)`
disables it, while a nonempty `disabledReason(row)` also provides an
explanation. Labels are host-supplied translated text. Built-in Duplicate,
Delete and pin actions use table labels and kit glyphs.

The second factory argument accepts `onAddRow`, `onDuplicateRow`,
`onDeleteRow` and `confirmDeleteRow`. `onAddRow` adds a toolbar control;
duplicate and delete append actions to the host's list. Delete confirms by
default. To request a dialog for another action, set its `confirm` with
`title`, `message(row)`, `confirmLabel` and optional `danger`.

Pass a `ConfirmHandler` through `[confirm]` to use an application dialog.
It receives the message and an `onConfirm()` callback; call that callback
only after acceptance. Both Angular shells default to browser confirmation
when no handler is supplied. A dialogless environment cannot implicitly
approve the action.

Row action and mutation callbacks do not provide the bulk-action runner's
pending/error state. For remote writes, the host must handle promises,
report failures and update its rows on success. Use a signal read inside
`disabledReason` to keep a pending row from being acted on twice.

## Rendering and behavior

Buttons stop row-click propagation, so an action does not also activate the
row. Menu execution closes the menu. The same action list appears on cards;
its labels and disabled reasons remain available to keyboard and assistive
technology users. The Columns menu can hide the reserved actions column.

`[renderRowActions]` accepts an Angular template or component with
`RowActionsContext<TRow>`: `$implicit`/`row`, `actions`, `confirm` and
`labels`. Preserve the confirmation and disabled/hidden semantics when
replacing the controls. An `editsRow: true` action can open a composed
row-editing form; without a row form it is omitted.

Configure the feature before mounting. The host's data changes can remain
reactive, as in the signal example. See [cell editing](./cell-editing.md),
[selection and bulk actions](./selection.md) and
[customization](./customization.md).
