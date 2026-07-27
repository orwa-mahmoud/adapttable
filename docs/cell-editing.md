# React table inline cell editing

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`editable` columns + `onCellEdit`); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [edit cells in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/editing/) — a real table you can type into, not a recording.

Edit a cell in place by passing `onCellEdit` and marking columns `editable`.
Omit `onCellEdit` and the table never opens an editor — even if columns
declare `editable`. The table never mutates rows; your handler applies the
change.

## Example

```tsx
import { useState } from "react";
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  role: string;
  status: "Active" | "Planned" | "Blocked";
}

const SEED: Person[] = [
  { id: "1", name: "Aisha", role: "Engineer", status: "Active" },
  { id: "2", name: "Jonas", role: "Designer", status: "Planned" },
];

export function People() {
  const [rows, setRows] = useState(SEED);
  return (
    <DataTable
      data={rows}
      columns={[
        { key: "name", sortable: true, editable: true },
        {
          key: "status",
          editable: true,
          editor: {
            type: "select",
            options: ["Active", "Planned", "Blocked"],
          },
        },
        { key: "role", editable: (row) => row.status !== "Blocked" },
      ]}
      rowKey={(r) => r.id}
      onCellEdit={(row, key, nextValue) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, [key]: nextValue as never } : r
          )
        );
      }}
    />
  );
}
```

## How it works

- **Opt-in.** `onCellEdit` is the switch. Without it, cells stay plain display
  (package DNA: nothing is pushed on the developer).
- **Per-column.** `editable` is `true`, `false`, or `(row) => boolean`. The
  editor defaults to `"text"`; use `"number"` or
  `{ type: "select", options }` for the other kits.
- **Keyboard.** Double-click / Enter / F2 begins; Enter commits; Escape
  cancels and restores focus; Tab / Shift+Tab commits and advances to the
  next editable cell.
- **One-way data flow.** The commit payload is
  `onCellEdit(row, key, nextValue)` — adapters render kit-native inputs;
  core owns the state machine so every kit behaves the same.
- Out of scope (by design): row-level edit mode, validation UI, and
  optimistic-update helpers — persistence stays with the host.

## Options

| Prop / field | Type                                                   | Default  | Description                                                                |
| ------------ | ------------------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| `onCellEdit` | `(row: TRow, key: string, nextValue: unknown) => void` | —        | Change channel; its presence enables editing.                              |
| `editable`   | `boolean \| ((row: TRow) => boolean)`                  | —        | Whether this column can open an editor (still requires `onCellEdit`).      |
| `editor`     | `"text" \| "number" \| { type: "select"; options }`    | `"text"` | Widget for the active cell.                                                |
| `editValue`  | `(row: TRow) => string`                                | —        | Draft seed when the displayed cell is formatted but editing needs the raw. |
| `labels`     | `TableLabels`                                          | English  | Override `editCell` for the activate control's accessible name.            |

## Headless editing

The editing engine is exported for custom adapters and fully custom tables.
`useCellEditing` is the state machine (one active cell, a draft string, and
the Enter / Escape / Tab keyboard flow); `EditableCellGate` is the reusable
activation wrapper every built-in adapter renders (double-click / Enter / F2
to begin, with the cell value as the accessible name and the edit hint as
its `title`).

| Export                                                                   | Purpose                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `useCellEditing` / `CellEditingState`                                    | The state machine hook and the state it returns.                                    |
| `EditableCellGate` / `EditableCellGateProps`                             | Activation wrapper: display content when idle, the kit's editor while active.       |
| `EditableCellEditing`                                                    | The editing bundle adapters receive from the chrome (`chrome.editing`).             |
| `CellEditCommit` / `CellEditTarget`                                      | A commit payload (`row`, `key`, `value`) and the active-cell address.               |
| `CellEditor` / `CellEditorOption`                                        | The column `editor` descriptor and one option of a select editor.                   |
| `CellEditKeyAction` / `CellEditKeyOutcome` / `CellEditNavigation`        | Keyboard-flow vocabulary: what a key press means and where focus goes next.         |
| `EditableCellController` / `EditableCellEditorCtrl` / `EditableCellMode` | The controller handed to a custom editor: draft, commit/cancel, mode.               |
| `EditableColumnLike` / `isCellEditable` / `hasEditableColumns`           | The minimal column shape editing reads, plus the two predicates the chrome uses.    |
| `parseCellEditValue` / `resolveCellEditor` / `normalizeEditorOptions`    | Draft parsing (number editors yield `number \| null`) and editor/option resolution. |

## Notes

- Works on desktop rows and mobile cards, LTR and RTL.
- Custom `Cell` / `accessor` still render in display mode; the editor replaces
  them only while that cell is active.
- Prefer updating your row list immutably in `onCellEdit` so React sees a new
  `data` / source identity.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/) —
double-click an editable cell (Person, Email, or Team) in the editing
section.
