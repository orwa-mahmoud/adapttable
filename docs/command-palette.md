# React table command palette and context menu — commandPalette, contextMenu

▶ **See it working:** [the Feature Lab](https://adapttable.orwamahmoud.com/react/demo/all-options/) — turn **Command palette (⌘K)** and **Right-click menus** on, then press Cmd/Ctrl+K or right-click a header.

Two opt-in features put the table's actions where people look for them.
`commandPalette()` from `@adapttable/<kit>/command-palette` opens a searchable
list of table actions on Cmd/Ctrl+K. `contextMenu()` from
`@adapttable/<kit>/context-menu` opens a menu for the header, row or cell
under the pointer. Both draw with the kit's own dialog and menu components.
Omit them from `features` and nothing is bound, drawn or bundled. See
[feature composition](./features.md).

An entry in either is the same object: a `Command` is a `ContextMenuItem`. An
action written once can be offered in both.

## Example

```tsx
import { printTable } from "@adapttable/core/pdf";
import { type ColumnDef, DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import { commandPalette } from "@adapttable/mantine/command-palette";
import { contextMenu } from "@adapttable/mantine/context-menu";
import { exportCsv } from "@adapttable/mantine/export";
import { print } from "@adapttable/mantine/print";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const people: Person[] = [
  { id: "1", name: "Amira Hassan", team: "Platform", budget: 12000 },
  { id: "2", name: "Tom Becker", team: "Design", budget: 8400 },
  { id: "3", name: "Lina Park", team: "Platform", budget: 15100 },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true, lockVisibility: true },
  { key: "budget", header: "Budget", sortable: true },
];

export function People() {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        cellNavigation(),
        exportCsv(),
        print(() => printTable({ rows: people, columns })),
        commandPalette(),
        contextMenu(),
      ]}
    />
  );
}
```

Cmd/Ctrl+K lists **Print**, **Export CSV** and **Clear all**. Right-clicking
the Name header offers Sort ascending, Sort descending and Hide column; the
Team header offers only the two sorts, because it is locked against hiding.
Right-clicking a cell offers Copy. The snippets below reuse `people` and
`columns` from this example.

## Command palette

### How it works

- Cmd+K or Ctrl+K opens the palette; either modifier satisfies `mod` on every
  platform. The shortcut listens on the document, so it works wherever focus
  is on the page, text inputs included.
- The list is the built-in commands followed by yours, in registration order.
  Order does not change as you type.
- Typing filters by a case- and accent-insensitive substring of the label, so
  "resume" finds "Résumé".
- Choosing an entry closes the palette first, then runs `onSelect`.
- A disabled entry stays in the list, announced as disabled, and does not run.
- When nothing matches, the palette shows `labels.commandEmpty`
  ("No matching command").

### Built-in commands

Only the commands whose handler exists appear:

| Command   | Key             | Label (`labels.*`)         | Appears when                                                                                      |
| --------- | --------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| Print     | `print`         | `print` — "Print"          | [`print(onPrint)`](./toolbar-and-view-controls.md#print) is composed, with or without its button. |
| Export    | `export`        | `exportCsv` — "Export CSV" | [`exportCsv()`](./exporting.md) is composed. It runs the toolbar button's export.                 |
| Clear all | `clear-filters` | `clearAll` — "Clear all"   | Always; disabled while no filter is active.                                                       |

The Export entry is captioned `labels.exportCsv` whichever writer the export
uses.

### Registering commands

Pass `commands` to add entries after the built-ins:

```tsx
import { commandPalette } from "@adapttable/mantine/command-palette";

const archiveTeam = () => fetch("/api/team/archive", { method: "POST" });

<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    commandPalette({
      commands: [
        {
          key: "audit",
          label: "Open audit log",
          onSelect: () => window.open("/audit"),
        },
        {
          key: "archive",
          label: "Archive team",
          danger: true,
          onSelect: archiveTeam,
        },
      ],
    }),
  ]}
/>;
```

A plugin registers the same object with `host.registerCommand(command)` in its
`setup`; see [host plugins](./features.md#host-plugins--setuphost). Commands
from options and plugins are merged by `key`, so one key lists once.
A registered command lists only in a table that composes `commandPalette()`.

### The `Command` model

`Command` is `ContextMenuItem` from `@adapttable/core`:

| Field             | Type         | Description                                                             |
| ----------------- | ------------ | ----------------------------------------------------------------------- |
| `key`             | `string`     | Stable identity and React key.                                          |
| `label`           | `string`     | The caption, already localized. Search matches against it.              |
| `onSelect`        | `() => void` | Runs after the palette or menu closes.                                  |
| `disabled`        | `boolean`    | Listed and announced, but not selectable.                               |
| `danger`          | `boolean`    | Destructive; a kit may colour it (Mantine's context menu draws it red). |
| `separatorBefore` | `boolean`    | Draws a divider above the entry in a context menu.                      |

### Shortcuts

`shortcuts` replaces the key bindings. The default is `DEFAULT_SHORTCUTS`
(exported from `@adapttable/react`),
`[{ chord: "mod+k", command: "command-palette" }]`.

```tsx
commandPalette({
  shortcuts: [{ chord: "ctrl+shift+p", command: "command-palette" }],
});
```

A `Shortcut` is `{ chord, command }`. A chord is modifiers and a key joined by
`+`: `mod` matches Cmd or Ctrl, so one chord is right on macOS and elsewhere;
`ctrl`, `meta`, `alt` and `shift` are also accepted, and `alt` and `shift`
must match exactly. The key is compared case-insensitively against the
character the keyboard layout produces. A chord without `mod`, `ctrl` or
`meta` does not fire while focus is in a text input, textarea, select or
editable element.

`command-palette` is the only command key a shortcut runs. `shortcuts: []`
binds nothing; the palette still opens from a toolbar control
(`button: true`) or from your own control through `open` and
`onOpenChange`.

### Opening it from a control

`commandPalette({ button: true })` puts a **Command palette** button among the
toolbar's view controls, drawn with the kit's own button (part
`command-palette-button`, `aria-haspopup="dialog"`, `aria-expanded` while the
palette shows; unstyled and shadcn style it through
`classNames.commandPaletteButton`). The label is `labels.commandPalette`.

To open it from a control of your own, hold the state:

```tsx
import { commandPalette } from "@adapttable/mantine/command-palette";

const [paletteOpen, setPaletteOpen] = useState(false);

<Button onClick={() => setPaletteOpen(true)}>Commands</Button>
<DataTable
  {...props}
  features={[
    commandPalette({ open: paletteOpen, onOpenChange: setPaletteOpen }),
  ]}
/>;
```

`onOpenChange` is told whenever the palette asks to open or close — the
shortcut, the toolbar control, Escape, or a command having run — with or
without `open`.

### `commandPalette` options

`commandPalette(options?: boolean | CommandPaletteOptions)`:

| Option         | Type                      | Default             | Description                                    |
| -------------- | ------------------------- | ------------------- | ---------------------------------------------- |
| `commands`     | `readonly Command[]`      | `[]`                | Entries appended after the built-ins.          |
| `shortcuts`    | `readonly Shortcut[]`     | `DEFAULT_SHORTCUTS` | The chords that open the palette.              |
| `button`       | `boolean`                 | `false`             | Draw a toolbar control that opens the palette. |
| `open`         | `boolean`                 | —                   | Controlled open state.                         |
| `onOpenChange` | `(open: boolean) => void` | —                   | Told when the palette asks to open or close.   |

## Context menu

### Targets

The menu reads what was clicked from the table's `data-adapttable-part`
attributes. `ContextMenuTarget<TRow>` is one of:

| `kind`   | Shape                             | Occurs when                                                                                           |
| -------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `header` | `{ kind, columnKey }`             | The event starts inside a column header cell.                                                         |
| `cell`   | `{ kind, row, rowId, columnKey }` | The event starts inside a body cell of a rendered row.                                                |
| `row`    | `{ kind, row, rowId }`            | The event starts inside a rendered row but outside any cell — the gap between cells, a pinned spacer. |

Anywhere else — the toolbar, the footer, a mobile card — has no target, and
no menu opens.

### Built-in entries

Every kit with a `/context-menu` subpath (Mantine, MUI, Chakra UI, Ant Design,
Radix, Base UI, shadcn/ui, unstyled) wires the same handlers:

| Target        | Entry                            | Shown when                                                                         | Does                                                                        |
| ------------- | -------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `header`      | Sort ascending, Sort descending  | The column is `sortable`.                                                          | Sorts by the column; the current direction is disabled.                     |
| `header`      | Filter column                    | The column has a `filter`.                                                         | Opens the table's filter panel.                                             |
| `header`      | Hide column                      | The column is not `lockVisibility`.                                                | Hides the column.                                                           |
| `cell`, `row` | Copy                             | Always; disabled on a `row` target.                                                | Copies the cell, or the selection it sits inside.                           |
| `cell`, `row` | Cut                              | `cellNavigation()` is composed and `onCellCut` is set; disabled on a `row` target. | Copies like Copy, then calls `onCellCut(range)` once the clipboard took it. |
| `cell`, `row` | Pin to top, Pin to bottom, Unpin | `rowPinning()` is composed; each shows only where it applies.                      | Pins or unpins the row, as its row actions do.                              |

Labels are `labels.sortAscending`, `sortDescending`, `filterColumn`,
`hideColumn`, `copyCells`, `cutCells`, `pinToTop`, `pinToBottom` and
`unpinRow`. Filter column is separated from the sorts by a
divider.

With [`cellNavigation()`](./cell-navigation.md#copying-from-the-context-menu)
composed, Copy goes through the grid focus: a click inside a selected range
copies the range; anywhere else copies the clicked cell. Without it, Copy
writes the clicked cell's value. The row pin entries follow the divider after
Copy and Cut.

The model in `@adapttable/core` also defines a column Pin to start / Unpin
entry for headers (`onTogglePin`); the kits leave it unwired, and the Columns
menu owns column pinning.

When a target has no entries — every built-in unwired or locked and no custom
items — no menu renders.

### Custom items

`items(target)` returns extra entries for each target. They are appended after
the built-ins behind a divider:

```tsx
import { contextMenu } from "@adapttable/mantine/context-menu";

<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    contextMenu<Person>({
      items: (target) =>
        target.kind === "header"
          ? []
          : [
              {
                key: "open",
                label: `Open ${target.row.name}`,
                onSelect: () => window.open(`/people/${target.rowId}`),
              },
            ],
    }),
  ]}
/>;
```

`contextMenu<Person>` types `target.row`, so `target.row.name` checks against
`Person`.
Return `[]` for a target that needs nothing. A plugin adds a factory of the
same shape with `host.registerContextMenuItems(items)`.

`contextMenu(options?: boolean | ContextMenuOptions<TRow>)`:

| Option  | Type                                                              | Default | Description                           |
| ------- | ----------------------------------------------------------------- | ------- | ------------------------------------- |
| `items` | `(target: ContextMenuTarget<TRow>) => readonly ContextMenuItem[]` | —       | Entries appended after the built-ins. |

### Opening the menu

| Route    | Opens with                        | Positioned at                             |
| -------- | --------------------------------- | ----------------------------------------- |
| Pointer  | Right-click                       | The pointer.                              |
| Keyboard | Shift+F10, or the ContextMenu key | The bottom centre of the focused element. |
| Touch    | Press and hold for 500 ms         | The touch point.                          |

A touch that moves more than 10 px before the 500 ms elapse is a scroll, and
the press is cancelled. Mouse and pen presses never open the menu by holding.

## Notes

- **Keyboard.** In the palette, focus moves to the search input on open. The
  arrow keys move the highlighted entry (wrapping), Home and End jump to the
  ends, Enter runs it and Escape closes. Tab stays inside the dialog. Clicking
  outside closes it. Focus returns to the element that had it before the
  palette opened. The context menu is the kit's own menu primitive, which
  handles arrow keys, typeahead and Escape; closing returns focus to the
  header, row or cell it opened from.
- **Screen readers.** The palette is a dialog named `labels.commandPalette`
  ("Command palette"). Its input is a `combobox` labelled
  `labels.commandSearch` ("Search commands") that controls a `listbox` of
  `option`s, with the highlighted entry as `aria-activedescendant`, so focus
  stays in the input while the arrows move. The context menu is named
  `labels.contextMenu` ("Table actions"); disabled entries are announced
  rather than removed.
- **Mobile.** On a touch screen, press and hold opens the context menu over
  the desktop table's headers, rows and cells. The mobile card layout carries
  none of those parts, so holding a card opens nothing. The palette opens only
  from a keyboard chord.
- **RTL.** Menus position with the kit's own placement logic; shortcuts are
  unaffected by direction.
- **Fullscreen.** While [`fullscreen()`](./toolbar-and-view-controls.md#fullscreen)
  is active, the context menu portals into the fullscreen element.
- **Styling.** Class names and parts (`commandPalette`, `commandInput`,
  `commandItem`, `commandEmpty`, `contextMenu`, `contextMenuItem`,
  `contextMenuSeparator`) are listed in
  [customization](./customization.md#view-controls). Adapter authors build on
  `CommandPaletteChrome` and `ContextMenuChrome` from
  `@adapttable/react/adapter`; the pure pieces — `tableCommands`,
  `filterCommands`, `contextMenuItems`, `resolveContextTarget` — are in
  `@adapttable/core`.
