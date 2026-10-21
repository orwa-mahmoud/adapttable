# Vue cell, row and batch editing

Edit Vue table cells, rows or batches with validation, host-owned saves, dirty state and undo/redo.

These examples use `@adapttable/vue-unstyled`. Import matching feature paths
from your selected adapter so its own kit renders the controls. See
[Vue installation and providers](./getting-started.md).

Mark editable columns with `editable: true`, then provide the host write:

```ts
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import {
  dirtyIndicators,
  editing,
  editHistory,
  undoRedoButtons,
} from "@adapttable/vue-unstyled/editing";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
]);
const columns: ColumnDef<Person>[] = [
  { key: "name", editable: true },
  { key: "score", editor: "number", editable: true },
];
const features = [
  editing<Person>((row, key, value) => {
    rows.value = rows.value.map((item) =>
      item.id === row.id ? { ...item, [key]: value } : item
    );
  }),
  editHistory({ depth: 50 }),
  undoRedoButtons(),
  dirtyIndicators(),
];
```

`editing<TRow>(onCellEdit: CellEditHandler<TRow>, extras?)` sends
`(row, columnKey, value)` to the host. `rowEditing<TRow>(onRowEdit, extras?)`
sends `(row, patch)` on Save. `batchEditing<TRow>(onBatchEdit, extras?)`
sends `readonly BatchRowEdit<TRow>[]`, each carrying `row`, `rowId` and
`patch`, when the batch is saved. Async handlers can return their persistence
promise so the binding can show pending state and failures. Replace the host
rows when saving succeeds; no factory mutates them for you.

A double-click, Enter or F2 opens a cell's editor. Pass
`editing(onCellEdit, { editActivation: "click" })` to open it on the first
click instead, the way a form field does; Enter and F2 still work.

`EditingLifecycleExtras<TRow>` includes validation/application hooks, edit
lifecycle/error callbacks, rollback, dirty tracking, history, row versions,
conflict policy/handler, the `editActivation` gesture and optional
`rowEditIcons`. It omits rows, columns,
row key and the three primary write callbacks, which the shell/factory supplies.
`TableEditingOptions<TRow>` is the complete headless input, requiring rows,
editable columns and a row key. Native editors cover text, number, boolean,
date/time and select controls; a custom editor uses the typed editor contract.

Batch mode takes precedence over row mode when both are enabled. To use history
with row or batch editing, also compose `editing(onCellEdit)` as the replay
callback: undo/redo applies individual cell changes through that host callback.
Without it, enabling history for row/batch editing throws. `editHistory(true |
false | { depth? })` configures recording, `undoRedoButtons()` renders its
controls, and `dirtyIndicators()` enables dirty markers. `DirtyEdits` gives a
host observer `count`, `confirm`, `confirmRow` and `confirmAll` to acknowledge
persisted changes.

The binding editing entry exposes the following composables. Each input accepts
a `MaybeRefOrGetter` options object; the optional second argument is
`ExternalStoreOptions`, whose `active` ref/getter further gates the owning scope.

| API                 | Input and result                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `useTableEditing`   | `TableEditingOptions<TRow>` to `TableEditingModel<TRow>`: computed `bundle: EditingBundle<TRow>` and `history: EditHistoryState<TRow>`. |
| `useCellEditing`    | Optional `CellEditSessionOptions<TRow>` to a computed `CellEditingState<TRow>`.                                                         |
| `useCellSaveState`  | Optional `CellSaveStoreOptions<TRow>` to computed save/error/rollback state.                                                            |
| `useEditValidation` | Optional `EditValidationStoreOptions<TRow>` to computed validation state and async `check`; obsolete checks are invalidated.            |
| `useDirtyCells`     | Optional `DirtyCellsOptions`, extending the neutral dirty-store options with `onDirtyChange`, to computed dirty-cell state.             |
| `useRowEditing`     | `RowEditStoreOptions<TRow>` to computed row drafts, active row and save/cancel actions.                                                 |
| `useBatchEditing`   | `BatchEditStoreOptions<TRow>` to computed batch drafts and save/cancel actions.                                                         |
| `useEditHistory`    | `EditHistoryControllerOptions<TRow>` to computed history with guarded undo/redo.                                                        |

`useEditableCell(input)` adapts the neutral `editableCellController` input into
a computed controller. `useEditableCellModel(input)` takes
`VueEditableCellProps<TRow>` and returns `ComputedRef<EditableCellModel<TRow>>`,
adding activation/editor props, display content, unit mode, conflict prompt and
focus/error wiring. The prop type specializes `EditableCellSlotProps` to Vue
columns and `VNodeChild` content.

`EditableCellChrome({ model, controls, classNames? })` requires
`EditableCellChromeSlots<TRow>`: Activate, Editor and Button.
`EditableCellEditorProps<TRow>` provides the controller, label, semantic attrs,
focus ref, change, blur and keydown actions. `EditableCellClassNames` styles the
wrapper and error/status regions. For a custom editor,
`editableCustomControl(model): CustomCellEditorCtrl` maps the existing model's
draft, commit/cancel, keyboard, focus, validation and conflict actions; do not
create a second edit controller for the same cell.

`RowEditActionsChrome` and `BatchEditBarChrome` accept their neutral
`RowEditActionsProps<TRow>`/`BatchEditBarProps<TRow>` plus required
`EditingActionSlots`. Its Button receives `EditingActionButtonProps`: label,
part, optional icon, semantic attrs (including disabled state) and click action. Native counterparts are `NativeEditableCell`,
`NativeRowEditActions` and `NativeBatchEditBar`, exported from `/editing`
(and the batch bar from `/batch-editing`).

The shell publishes one `EditingChromeModel<TRow>` through
`EDITING_CHROME_MODEL`/`editingChromeModelKey<TRow>()`. Its optional row function
builds row-action props and its batch model builds the shared save bar.
`editableCellSlotKey`, `rowEditActionsSlotKey` and `batchEditBarSlotKey`
specialize required feature slots to the same row type.

## Explore the implementation

Use the [Vue live demo](https://adapttable.orwamahmoud.com/vue/demo/) to switch
adapters and the [Vue Feature Lab](https://adapttable.orwamahmoud.com/vue/demo/all-options/)
to compose features. The [feature index](./features.md) lists native imports and
[API reference](./api.md) documents the binding and controlled contracts.
