# React table column management — rename, show, hide, reorder, pin & resize

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — this page's features are already wired in `src/App.tsx` (`columnMenu()` + `resizableColumns()`); edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [rename, pin, resize and reorder columns in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/columns/) — a real table you can edit and drag, not a recording.

Let users rename, show/hide, reorder, pin, and resize columns — compose one factory per
capability from `@adapttable/<kit>/<feature>`, with the resulting layout
persistable to the URL or localStorage. The import is the switch; enabling props
such as `enableColumnMenu` or `resizableColumns` draw nothing on their own. See
[feature composition](./features.md). Every adapter shares the same engine from
`@adapttable/core`.

## Example

```tsx
import { useColumnLayoutStorageState } from "@adapttable/core";
import { type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { columnMenu } from "@adapttable/mantine/column-menu";
import { resizableColumns } from "@adapttable/mantine/resizable-columns";
import { rowActions } from "@adapttable/mantine/row-actions";
import { useState } from "react";

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

const initialColumns: ColumnDef<Person>[] = [
  { key: "name", width: 200, renameable: true },
  { key: "department.name", header: "Department", width: 160 },
  { key: "city", width: 140 },
  { key: "salary", align: "end", width: 140 },
  { key: "hiredAt", width: 140 },
];

export function People() {
  const [columns, setColumns] = useState(initialColumns);
  // Persist the user's layout to localStorage; swap for useColumnLayoutUrlState
  // (from @adapttable/core) to make it part of shareable links instead.
  const { layout, onLayoutChange } = useColumnLayoutStorageState({
    storageKey: "people-table-columns",
    defaultColumnLayout: { pinned: { name: "start" } },
  });

  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(r) => r.id}
      features={[
        columnMenu(), // Columns menu: rename, show/hide, reorder, pin
        resizableColumns(), // drag or arrow-key resize handles
        rowActions([
          { key: "edit", label: "Edit", onClick: (r) => console.log(r) },
        ]),
      ]}
      maxHeight={420} // scroll box so pinned columns visibly stick
      columnLayout={layout}
      onColumnLayoutChange={onLayoutChange}
      onColumnRename={(key, name) => {
        // The table updates its layout immediately. Persist the accepted
        // domain name in the host just like an edited cell value.
        setColumns((current) =>
          current.map((column) =>
            column.key === key ? { ...column, header: name } : column
          )
        );
      }}
    />
  );
}
```

## How it works

- `columnMenu()` renders the built-in Columns menu: a search box, bulk show/hide/unpin, a visibility toggle per column, drag- or arrow-key reorder on each row's grip, a pin control, a per-column submenu (sort, pin, hide, auto-size, filter, rename, reset one), auto-size-all, and reset-all. Hiding a column never reorders the rest. `lockPosition` / `lockVisibility` / `lockWidth` / `lockPin` on a `ColumnDef` gray out the matching controls.
- Set `renameable: true` on a column and provide `onColumnRename(key, name)` to offer **Rename column**. The kit-native inline form keeps a visible label, trims on save, rejects a blank name, commits with Enter, cancels with Escape, restores focus, and announces the completed rename to screen readers. The key never changes.
- Semantic-table adapters also put a small, named rename control beside the
  header caption for a direct path. Ant Design keeps the menu path because its
  native sorted title and sticky header clone own that hit target; keyboard
  users retain the same complete rename form through the Columns menu.
- The layout applies the accepted name immediately to desktop headers, mobile labels, the Columns menu, exports and accessible column names. The callback lets the host persist the domain name and update its `columns` definition; doing so also updates any column-derived filter label. An explicitly named standalone filter keeps its own label.
- Pinning is logical (inline start/end), so a "left" pin sticks to the correct edge under `dir="rtl"`. It needs a horizontal scroll context to visibly stick — set `maxHeight`, or let the table exceed its container width.
- `resizableColumns()` adds a handle to every header: drag it, or focus it and press ←/→ (16 px per step, 60 px minimum). Direction-aware, so it widens the right way in RTL.
- The row-actions column is first-class under the reserved key `"actions"` (`ACTIONS_COLUMN_KEY`): the menu lists it with a visibility toggle and an end-pin toggle — `hidden: ["actions"]` hides it, `pinned: { actions: "right" }` pins it to the end on its own, no data-column pin required. It never reorders or resizes; it always trails.
- The layout state is `{ hidden, order, pinned, widths, names?, collapsedGroups? }` (`ColumnLayoutState`), keyed by column key. Uncontrolled by default; seed it with `defaultColumnLayout`, or own it with `columnLayout` + `onColumnLayoutChange` — the same controlled/uncontrolled split as a form input. `names` and `collapsedGroups` are omitted when they carry no override.
- Two ready-made persistence hooks feed the controlled mode: `useColumnLayoutUrlState({ urlKey })` keeps the layout in the query string (`colHide` / `colPin` / `colOrder` / `colW` / `colName` / `colGroupCollapse` — shareable links and Saved Views), and `useColumnLayoutStorageState({ storageKey })` keeps it in localStorage (user preference).

## Options

| Factory / prop              | Type                                  | Default | Description                                                                                                                    |
| --------------------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `columnMenu()`              | —                                     | off     | Factory from `@adapttable/<kit>/column-menu`; composes the Columns menu (show/hide, pin, reorder).                             |
| `resizableColumns()`        | —                                     | off     | Factory from `@adapttable/<kit>/resizable-columns`; drag/keyboard column-resize handles.                                       |
| `fitColumns()`              | —                                     | off     | Factory from `@adapttable/<kit>/fit-columns`; columns share the container width.                                               |
| `collapsibleColumnGroups()` | —                                     | off     | Factory from `@adapttable/<kit>/column-groups`; group headers gain a collapse toggle. See [column groups](./column-groups.md). |
| `defaultColumnLayout`       | `Partial<ColumnLayoutState>`          | —       | Initial layout for the uncontrolled mode.                                                                                      |
| `columnLayout`              | `ColumnLayoutState`                   | —       | Controlled layout (hidden/order/pinned/widths/names).                                                                          |
| `onColumnLayoutChange`      | `(next: ColumnLayoutState) => void`   | —       | Change handler for the controlled layout.                                                                                      |
| `renameable`                | `boolean`                             | `false` | Per-column opt-in for the kit-native rename action.                                                                            |
| `onColumnRename`            | `(key: string, name: string) => void` | —       | Host persistence callback; required before rename controls are offered.                                                        |
| `maxHeight`                 | `number`                              | —       | Fixed-height scroll box (px); enables sideways scroll + visible pinning.                                                       |

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

## Widths, bounds and shares

A column can say how wide it is three ways, and they compose:

```tsx
const columns = [
  { key: "id", header: "ID", width: 80 }, // exactly this
  { key: "name", header: "Name", minWidth: 160 }, // never narrower
  { key: "note", header: "Note", flex: 2 }, // twice the leftover space
];
```

`minWidth` and `maxWidth` are bounds the column keeps whatever else happens — a
resize will not cross them, and neither will the fitting mode. `flex` asks for a
share of whatever space is left over.

### Filling the container

By default a table takes the width its columns need and scrolls when that is
more than the container. Compose `fitColumns()` to reverse it: the columns
share the container instead.

```tsx
import { fitColumns } from "@adapttable/mantine/fit-columns";

<DataTable
  data={rows}
  columns={columns}
  rowKey={rowKey}
  features={[fitColumns()]}
/>;
```

Columns with a `width` keep it, columns with a `flex` take that share, and
everything else divides what remains equally. A width the **user** dragged wins
over all of it — they said what they wanted.

Underneath it is CSS the browser already knows: a fixed table layout with
percentage widths shares space proportionally, and the bounds clamp it. The Ant
Design adapter renders through antd's own `<Table>`, which sets its own layout
mode; the per-column widths, bounds and shares still apply there.

## Sizing a column to its content

Double-click a resize handle and that column takes the width of its widest
rendered cell. The Columns menu's **Size columns to content** does the same for
every column at once.

Measurement comes from the DOM, not the data: a cell renders a badge, an avatar
and a name, and the only honest answer to "how wide is this column" is what the
browser laid out. It measures the **rendered** rows — the page, or the window
under virtualization — which is the set the reader is looking at, and it reads
each cell's content width, so a column that is currently clipping its text is
sized to fit it rather than to its clipped width. Running it again does not
keep adding width: once a cell already fits, the box is not treated as new
content.

The result is an ordinary width in the column layout: it persists, serializes to
the URL and to saved views, and a later drag overrides it exactly as it
overrides any other width. A column with nothing measurable on screen is left
alone rather than collapsed.

Both actions are localizable — `labels.autoSizeColumns` and
`labels.autoSizeColumn` — in all seventeen locales.

Headless: `measureColumnWidth(root, key)` and `autoSizeColumns(root, keys,
setWidth)`.
