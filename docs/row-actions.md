# React table row actions — add, duplicate and delete rows

▶ **See it working:** [row actions in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/rows/) — a trailing actions column, collapsed into a 3-dot menu. The same pages exist for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Import `rowActions` from `@adapttable/<kit>/row-actions`. It takes two
optional arguments: your own per-row actions, and the handlers that add,
duplicate and delete rows. A table that does not compose it carries none of
this — see [feature composition](./features.md).

```tsx
import { DataTable } from "@adapttable/mantine";
import { rowActions } from "@adapttable/mantine/row-actions";

function Tasks({ rows, setRows }: TasksProps) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        rowActions(
          [{ key: "open", label: "Open", onClick: (row) => openTask(row.id) }],
          {
            onAddRow: () => setRows((current) => [blankTask(), ...current]),
            onDuplicateRow: (row) =>
              setRows((current) => [{ ...row, id: nextId() }, ...current]),
            onDeleteRow: (row) =>
              setRows((current) => current.filter((r) => r.id !== row.id)),
          }
        ),
      ]}
    />
  );
}
```

## Your own actions

Each `RowAction` is `{ key, label, onClick }`, plus optional `icon` (renders
icon-only, with `label` as the tooltip and accessible name), `color`,
`isDisabled` / `disabledReason` (a non-empty reason disables the action and
explains why), `isHidden`, a `confirm` dialog (`title`, `message(row)`,
`confirmLabel`, `danger`) and `editsRow`, which opens the row's
[row-mode form](./cell-editing.md) instead of writing anything itself.

They render as trailing buttons on desktop and card buttons on mobile, in an
actions column that the Columns menu can hide or pin to the end.
`rowActionsLayout="menu"` collapses them into a 3-dot menu drawn with each
kit's own Menu (`labels.rowActionsMenu` names the trigger);
`renderRowActions` replaces the cell entirely and wins over the layout.

## Add, duplicate and delete

The second argument is `RowMutationHandlers`:

| Handler            | What appears                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `onAddRow`         | An **Add row** button in the toolbar (part `add-row`).            |
| `onDuplicateRow`   | An icon-only **Duplicate row** action on every row.               |
| `onDeleteRow`      | An icon-only **Delete row** action on every row, confirmed first. |
| `confirmDeleteRow` | `false` deletes without the confirmation dialog.                  |

Duplicate and Delete come after your own actions, so a delete stays last, under
the keys `DUPLICATE_ROW_ACTION_KEY` and `DELETE_ROW_ACTION_KEY`. The delete
dialog uses `labels.deleteRow` as its title and `labels.deleteRowConfirm` as
its question. `labels.addRow`, `labels.duplicateRow`, `labels.deleteRow` and
`labels.deleteRowConfirm` are translated in every bundled locale, and the
controls mirror in a right-to-left table.

**The table asks; you do the rest.** It stores no row and holds no draft. A row
you add arrives through the source like every other row — editable, filterable,
sortable, counted, grouped and virtualized from the moment it lands. What a copy
means (which fields carry over, what id it gets) is yours. For an in-memory
table, `insertRow`, `removeRow` and `applyRowPatches` from `@adapttable/core`
do the list work. Pair the handlers with [`editing()`](./cell-editing.md) and a
reader adds a blank row and fills it in place.

## Keyboard and screen readers

Every action is a real button in the kit's own component: Tab reaches it, Enter
and Space run it, and its label is the accessible name. With
[`rowPinning`](./row-pinning.md) composed, its pin actions join the same column.

## Headless

`useRowMutations` (`UseRowMutationsOptions` in, `RowMutationsState` out) builds
the state a kit renders: `canAdd`, `addRow`, and the Duplicate and Delete
actions, which `chrome.rowActions` already includes. See
[headless](./headless.md) and [building an adapter](./building-an-adapter.md).
