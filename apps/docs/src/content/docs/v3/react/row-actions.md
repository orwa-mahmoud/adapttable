---
title: "React table row actions — add, copy, delete (v3)"
description: Row actions for React data tables — your own per-row buttons or a
  3-dot menu, plus add, duplicate and delete rows through host handlers, in
  every UI kit.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table row actions — add, copy,
      delete","item":"https://adapttable.orwamahmoud.com/v3/react/row-actions/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/row-actions.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/row-actions.png
slug: v3/react/row-actions
---

▶ **See it working:** [row actions in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/rows/) — a trailing actions column, collapsed into a 3-dot menu. The same pages exist for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Import `rowActions` from `@adapttable/<kit>/row-actions`. It takes two
optional arguments: your own per-row actions, and the handlers that add,
duplicate and delete rows. A table that does not compose it carries none of
this — see [feature composition](/v3/react/features/).

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
[row-mode form](/v3/react/cell-editing/) instead of writing anything itself.

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
do the list work. Pair the handlers with [`editing()`](/v3/react/cell-editing/) and a
reader adds a blank row and fills it in place.

## Keyboard and screen readers

Every action is a real button in the kit's own component: Tab reaches it, Enter
and Space run it, and its label is the accessible name. With
[`rowPinning`](/v3/react/row-pinning/) composed, its pin actions join the same column.

## Headless

`useRowMutations` (`UseRowMutationsOptions` in, `RowMutationsState` out) builds
the state a kit renders: `canAdd`, `addRow`, and the Duplicate and Delete
actions, which `chrome.rowActions` already includes. See
[headless](/v3/react/headless/) and [building an adapter](/v3/react/building-an-adapter/).
