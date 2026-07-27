# React table column management — show/hide, reorder, pin, resize

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`enableColumnMenu` + `resizableColumns`); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [pin, resize and reorder columns in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/columns/) — a real table you can drag, not a recording.

Let users show/hide, reorder, pin, and resize columns — one prop per capability, with the resulting layout persistable to the URL or localStorage. Every adapter shares the same engine from `@adapttable/core`.

## Example

```tsx
import { useColumnLayoutStorageState } from "@adapttable/core";
import { type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  department: { name: string };
  city: string;
  salary: number;
  hiredAt: string;
}

const people: Person[] = [
  {
    id: "1",
    name: "Amira Hassan",
    department: { name: "Engineering" },
    city: "Dubai",
    salary: 96000,
    hiredAt: "2021-03-15",
  },
  {
    id: "2",
    name: "Tom Becker",
    department: { name: "Design" },
    city: "Berlin",
    salary: 78000,
    hiredAt: "2022-11-01",
  },
  {
    id: "3",
    name: "Lina Park",
    department: { name: "Engineering" },
    city: "Seoul",
    salary: 105000,
    hiredAt: "2019-07-20",
  },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", width: 200 },
  { key: "department.name", header: "Department", width: 160 },
  { key: "city", width: 140 },
  { key: "salary", align: "end", width: 140 },
  { key: "hiredAt", width: 140 },
];

export function People() {
  // Persist the user's layout to localStorage; swap for useColumnLayoutUrlState
  // (from @adapttable/core) to make it part of shareable links instead.
  const { layout, onLayoutChange } = useColumnLayoutStorageState({
    storageKey: "people-table-columns",
    defaultColumnLayout: { pinned: { name: "left" } },
  });

  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(r) => r.id}
      enableColumnMenu // Columns menu: show/hide, reorder, pin
      resizableColumns // drag or arrow-key resize handles
      maxHeight={420} // scroll box so pinned columns visibly stick
      columnLayout={layout}
      onColumnLayoutChange={onLayoutChange}
      rowActions={[
        { key: "edit", label: "Edit", onClick: (r) => console.log(r) },
      ]}
    />
  );
}
```

## How it works

- `enableColumnMenu` renders the built-in Columns menu: a visibility toggle per column, drag- or arrow-key reorder on each row's grip, a pin control cycling none → left → right → none, and a reset action. Hiding a column never reorders the rest.
- Pinning is logical (inline start/end), so a "left" pin sticks to the correct edge under `dir="rtl"`. It needs a horizontal scroll context to visibly stick — set `maxHeight`, or let the table exceed its container width.
- `resizableColumns` adds a handle to every header: drag it, or focus it and press ←/→ (16 px per step, 60 px minimum). Direction-aware, so it widens the right way in RTL.
- The row-actions column is first-class under the reserved key `"actions"` (`ACTIONS_COLUMN_KEY`): the menu lists it with a visibility toggle and an end-pin toggle — `hidden: ["actions"]` hides it, `pinned: { actions: "right" }` pins it to the end on its own, no data-column pin required. It never reorders or resizes; it always trails.
- The layout state is `{ hidden, order, pinned, widths }` (`ColumnLayoutState`), keyed by column key. Uncontrolled by default; seed it with `defaultColumnLayout`, or own it with `columnLayout` + `onColumnLayoutChange` — the same controlled/uncontrolled split as a form input.
- Two ready-made persistence hooks feed the controlled mode: `useColumnLayoutUrlState({ urlKey })` keeps the layout in the query string (`colHide` / `colPin` / `colOrder` / `colW` — shareable links), and `useColumnLayoutStorageState({ storageKey })` keeps it in localStorage (user preference).

## Options

| Prop                   | Type                                | Default | Description                                                              |
| ---------------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------ |
| `enableColumnMenu`     | `boolean`                           | `false` | Render the built-in Columns menu (show/hide, pin, reorder).              |
| `resizableColumns`     | `boolean`                           | `false` | Enable drag/keyboard column-resize handles.                              |
| `defaultColumnLayout`  | `Partial<ColumnLayoutState>`        | —       | Initial layout for the uncontrolled mode.                                |
| `columnLayout`         | `ColumnLayoutState`                 | —       | Controlled layout (hidden/order/pinned/widths).                          |
| `onColumnLayoutChange` | `(next: ColumnLayoutState) => void` | —       | Change handler for the controlled layout.                                |
| `maxHeight`            | `number`                            | —       | Fixed-height scroll box (px); enables sideways scroll + visible pinning. |

## Notes

- Give pinned columns numeric pixel `width`s: sticky insets are summed from them, and a relative width (`"20%"`) falls back to a 150 px estimate, so adjacent pins may not stack exactly.
- A hidden pinned column reads back as unpinned until it is shown again — only visible columns have a cell to stick.
- `useColumnLayoutUrlState` debounces URL writes by 150 ms (a resize drag commits per animation frame; unthrottled `replaceState` trips Safari's rate limit). Reads stay instant.
- `useColumnLayoutStorageState` removes its stored entry when the layout returns to the exact default, so defaults can evolve in later releases; it is SSR-safe (memory-only without a browser).
- Layouts are keyed by column `key` — renaming a key orphans any persisted layout for it (the column reappears with default placement).
- `defaultColumnLayout` only applies in uncontrolled mode; once you pass `columnLayout`, the controlled value is the single source of truth (the persistence hooks take their own `defaultColumnLayout`).
- **SSR-safe persistence**: a stored layout hydrates in an effect AFTER the
  first client render, so server and client markup always match — expect one
  paint with the default layout before the stored one applies. Blocked
  storage (Safari private mode, sandboxed webviews) is tolerated silently.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
