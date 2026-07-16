# React table row selection & bulk actions

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Pass `bulkActions` and row selection turns on: checkboxes on every row, a
tri-state header checkbox, and a selection toolbar with your action buttons.
No other wiring is required.

## Example

```tsx
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import {
  type BulkAction,
  DataTable,
  type RowAction,
} from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  role: string;
  status: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada Lovelace", role: "Engineer", status: "active" },
  { id: "2", name: "Alan Turing", role: "Founder", status: "active" },
  { id: "3", name: "Grace Hopper", role: "Admiral", status: "retired" },
];

// Per-row: trailing buttons on each desktop row / mobile card.
const rowActions: RowAction<Person>[] = [
  { key: "edit", label: "Edit", onClick: (row) => console.log("edit", row.id) },
];

// Bulk: buttons in the selection toolbar, fired with the selected ids.
const bulkActions: BulkAction[] = [
  {
    key: "archive",
    label: "Archive",
    onClick: (ids, { allMatching, total }) => {
      if (allMatching) console.log(`archive all ${total} matching rows`);
      else console.log("archive", ids);
    },
  },
  {
    key: "delete",
    label: "Delete",
    color: "red",
    confirm: {
      title: "Delete people",
      message: (count) => `Delete ${count} people? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    },
    onClick: (ids) => console.log("delete", ids),
  },
];

export function PeopleTable() {
  return (
    <DataTable
      data={PEOPLE}
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        { key: "status" },
      ]}
      rowKey={(r) => r.id}
      rowActions={rowActions}
      bulkActions={bulkActions}
      onSelectionChange={(ids) => console.log("selected", ids)}
    />
  );
}
```

## How it works

- `bulkActions` is the switch: its presence enables the checkbox column, the
  header tri-state (all / some / none of the visible rows), and the bulk bar
  that appears once at least one row is selected.
- **`RowAction` vs `BulkAction`**: a row action runs on one row
  (`onClick(row)`, `confirm.message(row)`); a bulk action runs on the
  selection (`onClick(ids, context)`, `confirm.message(count)`).
- **Select all on the page vs all N matching**: the header checkbox selects
  the visible page. When the whole page is selected and more rows match, a
  Gmail-style banner offers "Select all N matching"; accepting widens the
  scope and your action receives `BulkActionContext` —
  `{ allMatching: true, total }` — so you act on the whole filtered set
  server-side, not just the page `ids`. Any explicit toggle narrows the scope
  back to concrete ids.
- **Confirmation sized by scope**: a bulk action's `confirm.message(count)`
  receives `context.total` when all-matching is active, the page ids count
  otherwise. The dialog goes through the table's `confirm` handler
  (`window.confirm` by default); `danger: true` marks it destructive.
- **Controlled or uncontrolled**: omit `selectedIds` and the table owns the
  selection (`onSelectionChange` is then an observer). Pass `selectedIds` and
  it becomes controlled — apply `onSelectionChange` requests to your state to
  accept them, the same split as `columnLayout`.
- Selection is keyed by id (`selectionGetId`, defaulting to `rowKey`), so it
  survives page, sort, and page-size changes — and resets automatically when
  the result _set_ changes (a new search term or different filter values).

## Options

| Prop                | Type                      | Default          | Description                                                                                                              |
| ------------------- | ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `bulkActions`       | `BulkAction[]`            | —                | Bulk-action buttons; passing this turns on row selection.                                                                |
| `rowActions`        | `RowAction<TRow>[]`       | —                | Trailing per-row actions; independent of selection.                                                                      |
| `selectedIds`       | `readonly string[]`       | — (uncontrolled) | Controlled selection ids.                                                                                                |
| `onSelectionChange` | `(ids: string[]) => void` | —                | Uncontrolled: observer for every change (toggles, select-all, automatic resets). Controlled: the change-request handler. |
| `selectionGetId`    | `(row: TRow) => string`   | `rowKey`         | Selection id extractor when it must differ from the React key.                                                           |
| `confirm`           | `ConfirmHandler`          | `window.confirm` | Confirmation handler for actions with a `confirm` block; pass your own for a styled dialog.                              |

## Notes

- `BulkAction.onClick(ids, context)` may return a promise: the button shows a
  loading state, other bulk buttons disable while it runs, and the selection
  clears after a successful run.
- `BulkAction.disabledReason(ids)` returns a non-empty string to grey the
  button out _and_ explain why (shown as its tooltip). Row actions have
  `disabledReason(row)`, `isDisabled(row)`, and `isHidden(row)`.
- The per-action `confirm` block is
  `{ title, message, confirmLabel, danger? }` — all strings pre-translated.
  Your `confirm` handler receives the full `ConfirmRequest` (including
  `cancelLabel` and `onConfirm`).
- The selection toolbar's strings (`selectedCount`, `selectAllMatching`,
  `allMatchingSelected`, …) are overridable via the `labels` prop.
- Headless consumers can reuse the same machinery: `useSelection` (with a
  `resetKey`), `useBulkActionRunner`, and `runRowAction` are exported from
  `@adapttable/core`.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
