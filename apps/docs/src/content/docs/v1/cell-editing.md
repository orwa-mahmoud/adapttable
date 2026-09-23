---
title: "React table inline cell editing — opt-in onCellEdit (v1)"
description: Inline cell editing for React CRUD tables — opt-in onCellEdit,
  text/number/select editors, keyboard commit/cancel, kit-native inputs across
  every adapter.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table inline cell editing — opt-in
      onCellEdit","item":"https://orwa-mahmoud.github.io/adapttable/v1/cell-editing/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/cell-editing.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/cell-editing.png
slug: v1/cell-editing
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`editable` columns + `onCellEdit`); edit it in the browser, no install. [Other UI kits →](/adapttable/v1/getting-started/#try-it-in-stackblitz)

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
            r.id === row.id ? { ...r, [key]: nextValue as never } : r,
          ),
        );
      }}
    />
  );
}
```

## How it works

* **Opt-in.** `onCellEdit` is the switch. Without it, cells stay plain display
  (package DNA: nothing is pushed on the developer).
* **Per-column.** `editable` is `true`, `false`, or `(row) => boolean`. The
  editor defaults to `"text"`; use `"number"` or
  `{ type: "select", options }` for the other editors. Select `options` are
  `{ value, label }` objects or plain strings.
* **Keyboard.** Double-click / Enter / F2 begins; Enter commits; Escape
  cancels and restores focus; Tab / Shift+Tab commits and advances to the
  next / previous editable cell (row-major, wrapping). Blur (clicking away)
  commits.
* **Values.** `nextValue` is a string for `"text"` and select editors; a
  `"number"` editor yields a `number`, or `null` when the draft is empty or
  not a finite number.
* **One-way data flow.** The commit payload is
  `onCellEdit(row, key, nextValue)` — adapters render kit-native inputs;
  core owns the state machine so every kit behaves the same.
* Out of scope (by design): row-level edit mode, validation UI, and
  optimistic-update helpers — persistence stays with the host.

## Options

| Prop / field | Type                                                   | Default                    | Description                                                                |
| ------------ | ------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------- |
| `onCellEdit` | `(row: TRow, key: string, nextValue: unknown) => void` | —                          | Change channel; its presence enables editing.                              |
| `editable`   | `boolean \| ((row: TRow) => boolean)`                  | —                          | Whether this column can open an editor (still requires `onCellEdit`).      |
| `editor`     | `"text" \| "number" \| { type: "select"; options }`    | `"text"`                   | Widget for the active cell.                                                |
| `editValue`  | `(row: TRow) => string`                                | `sortValue`, then key path | Draft seed when the displayed cell is formatted but editing needs the raw. |
| `labels`     | `TableLabels`                                          | English                    | Override `editCell` for the activate control's accessible name.            |

## Notes

* Works on desktop rows and mobile cards, LTR and RTL.
* Custom `Cell` / `accessor` still render in display mode; the editor replaces
  them only while that cell is active.
* Prefer updating your row list immutably in `onCellEdit` so React sees a new
  `data` / source identity.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/) —
double-click the Email column.
