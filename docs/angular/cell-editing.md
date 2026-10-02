# Editable Angular table: inline cell and batch editing

Make an Angular table cell editable with validation, an async save callback and
keyboard controls. Compose `editing()` from your kit's `/editing` entry and mark
the columns that may change with `editable`. Every committed value goes to your callback. The
table owns the draft and save state; your application owns the rows and the
request that persists them.

These examples use
`@adapttable/angular-unstyled`; use `@adapttable/ng-zorro` and its matching
feature entries for NG-ZORRO controls. See [Getting started](./getting-started.md).

## Edit a table cell in Angular and save it to an API

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { editing } from "@adapttable/angular-unstyled/editing";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";

interface Task {
  id: string;
  title: string;
  hours: number;
}

@Component({
  selector: "app-editable-tasks",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Tasks"
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class EditableTasks {
  readonly rows = signal<readonly Task[]>([
    { id: "t1", title: "Review", hours: 2 },
  ]);
  readonly rowKey = (row: Task) => row.id;
  readonly columns: readonly ColumnDef<Task>[] = [
    { key: "title", header: "Task" },
    {
      key: "hours",
      header: "Hours",
      editable: true,
      editor: "number",
      parseValue: (draft) => Number(draft),
      validate: (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0
          ? undefined
          : "Enter a non-negative number",
    },
  ];
  readonly features = [
    editing<Task>(
      async (row, key, value) => {
        if (key !== "hours" || typeof value !== "number") {
          throw new Error("Unsupported task change");
        }
        const response = await fetch(
          `/api/tasks/${encodeURIComponent(row.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hours: value }),
          }
        );
        if (!response.ok) throw new Error("The task could not be saved");
        this.rows.update((rows) =>
          rows.map((task) =>
            task.id === row.id ? { ...task, hours: value } : task
          )
        );
      },
      {
        formatEditError: () =>
          "Save failed. Check your connection and try again.",
      }
    ),
    cellNavigation(),
  ];
}
```

`editing(callback)` receives `(row, columnKey, value)` and may return a promise.
It is a factory argument, not an `(onCellEdit)` Angular output. A rejected
promise follows the save-error path; do not catch and swallow a failed request
if the table needs to show that failure. The example waits for the server before
replacing the row. For an optimistic update, supply `onEditRollback` to restore
the prior row on rejection.

`editable` may be a predicate for per-row permission. Keep authorization in the
backend too. `parseValue` converts a draft; `validate` returns a message or
`undefined`, synchronously or asynchronously. `validateRow` and `applyEdit` in
the editing extras support cross-field rules without mutating the original row.

## Cell, row and batch commits

Choose the commit boundary that matches the operation:

- `editing(onCellEdit)` saves one cell
- `rowEditing(onRowEdit)` from `/editing` sends the row and a record of changed
  fields when the reader saves the row
- `batchEditing(onBatchEdit)` from `/batch-editing` sends the pending
  `BatchRowEdit[]` together, with the kit's Save/Discard bar

Both kits supply their own editors and row actions. Do not import batch editing
from `/editing`; its entry is separate. The callbacks still perform every write,
including undo or a batch save. `dirtyIndicators()` adds visual dirty marks;
`onDirtyChange` exposes the dirty state and confirmation operations to a host
that needs a navigation guard.

For history, compose `editHistory()` and `undoRedoButtons()` from `/editing`.
History replays changes through the host; it does not turn the table into a row
store. Multi-cell paste and fill can be recorded as one gesture.

## Save multiple edited rows in one batch

Use batch editing when the reader should review several changes before saving.
The following standalone example holds drafts until Save is pressed. Its host
endpoint, `PATCH /api/tasks/batch`, must validate every patch and return the
complete updated task list as `{ rows: Task[] }`. Implement that endpoint in
your application; it is not an endpoint supplied by the table library.

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { batchEditing } from "@adapttable/angular-unstyled/batch-editing";
import { dirtyIndicators } from "@adapttable/angular-unstyled/editing";

interface Task {
  id: string;
  title: string;
  hours: number;
}

@Component({
  selector: "app-batch-tasks",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Batch-edit tasks"
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class BatchTasks {
  readonly rows = signal<readonly Task[]>([
    { id: "t1", title: "Review", hours: 2 },
    { id: "t2", title: "Test", hours: 3 },
  ]);
  readonly rowKey = (row: Task) => row.id;
  readonly columns: readonly ColumnDef<Task>[] = [
    { key: "title", header: "Task" },
    {
      key: "hours",
      header: "Hours",
      editable: true,
      editor: "number",
      parseValue: (draft) => Number(draft),
      validate: (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0
          ? undefined
          : "Enter a non-negative number",
    },
  ];
  readonly features = [
    batchEditing<Task>(async (edits) => {
      const response = await fetch("/api/tasks/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edits: edits.map(({ rowId, patch }) => ({ id: rowId, patch })),
        }),
      });
      if (!response.ok) throw new Error("The batch could not be saved");
      const result = (await response.json()) as { rows: Task[] };
      this.rows.set(result.rows);
    }),
    dirtyIndicators(),
  ];
}
```

Each edit contains `row` (the original record), `rowId` (its stable key) and
`patch` (only changed fields, with parsed values). The example sends just the
ID and patch; the backend must authorize each row and allowlist writable fields.
Use a transactional endpoint if Save must be all-or-nothing. A rejected save
must remain a rejection so the table can retain the drafts for correction or
retry. Discard clears local drafts without persisting them.

Try the [Angular inline-editing demo](https://adapttable.orwamahmoud.com/angular/demo/unstyled/editing/)
or the [NG-ZORRO editing demo](https://adapttable.orwamahmoud.com/angular/demo/ng-zorro/editing/).

## Keyboard, mobile and incoming updates

Double-click a cell to open its editor. Keyboard grid navigation supplies an
accessible route to editable cells; Enter commits, Escape cancels, and Tab
commits and advances through the editing flow. Validation failures keep the
draft available for correction. Editors are also rendered inside mobile fields,
and row/batch controls remain available in the card layout. A custom card must
render each field's provided value template to retain those behaviors.

Use `onEditStart`, `onEditCommit`, `onEditCancel`, `onValidationFail` and
`onEditError` for application feedback. `rowVersion`, `editConflictPolicy` and
`onEditConflict` handle a live row changing while a draft is open; choose an
explicit policy for collaborative data instead of overwriting a newer value.

See [Cell navigation](./cell-navigation.md), [Realtime](./realtime.md),
[Mobile cards](./mobile.md) and the [Angular API](../api.md#the-angular-binding).
The [editing factory](../../packages/angular/angular/src/features/editing.ts)
and [editable-cell controller](../../packages/angular/angular/src/editing/editableCellController.ts)
define the lifecycle and validation contract.
