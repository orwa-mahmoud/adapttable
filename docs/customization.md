# Customize AdaptTable — slots, classNames, headless prop-getters

▶ **See it working:** [the unstyled adapter in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/?kit=tailwind) — same engine, your own classes.

A spectrum, all opt-in: restyle parts with `classNames`, replace parts with
`slots`, tune the chrome with props, or theme through your kit's provider.
Per-row class, colour and height come from
`rowAppearance({ rowClassName, rowStyle, rowHeight })` in
`@adapttable/<kit>/row-appearance` — see
[row styling and heights](./row-styling.md).

## `classNames` — per-part styling

Restyle without replacing. Every themed kit (Mantine, MUI, Chakra, Ant
Design, Radix Themes, Base UI) exposes five wrapper hooks (`root`,
`toolbar`, `table`, `card`, `footer`); the **unstyled** adapter exposes a
hook for every rendered node:

```tsx
import { DataTable } from "@adapttable/unstyled";

<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  classNames={{
    table: "w-full text-sm",
    row: "border-b hover:bg-zinc-50 data-[selected]:bg-blue-50",
    cell: "px-3 py-2",
    filtersPopover: "rounded-lg border bg-white shadow-xl",
    filtersDone: "rounded-md bg-zinc-900 text-white px-3 py-2",
  }}
/>;
```

Every unstyled node also carries a stable `data-adapttable-part` attribute —
the kebab-case of the `classNames` key (`searchField` →
`data-adapttable-part="search-field"`) — plus `data-*` state attributes, so
plain CSS, Tailwind, and shadcn tokens all work. The main parts are below;
`DataTableClassNames` on the unstyled adapter names every key (see
[adapter extras](./api.md#adapter-extras)).

> **Using shadcn/ui?** `@adapttable/shadcn` is this same unstyled adapter with
> the shadcn class preset already applied — import `DataTable` from
> `@adapttable/shadcn` and pass `classNames` to override only the parts you
> name.

### Toolbar & search

| Part          | Element                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `root`        | The outer wrapper around the whole table.                               |
| `toolbar`     | The toolbar row (search, filters, columns, views, your `toolbar`).      |
| `searchField` | The search field wrapper (input + leading icon).                        |
| `search`      | The search `<input>`.                                                   |
| `searchIcon`  | The leading magnifying-glass icon.                                      |
| `sortSelect`  | The mobile sort-by `<select>`.                                          |
| `rowsPerPage` | Rows-per-page `<select>` (toolbar in infinite mode, footer when paged). |

### Filters

| Part                                                                                                                    | Element                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `filtersButton`                                                                                                         | The Filters trigger button.                                                                                               |
| `filtersIcon`                                                                                                           | The funnel icon inside the trigger.                                                                                       |
| `filtersCount`                                                                                                          | The active-filter count badge.                                                                                            |
| `exportCsvButton`                                                                                                       | The Export CSV toolbar button (`exportCsv()` feature).                                                                    |
| `exportSpinner`                                                                                                         | The spinner inside that button while a host-handled export runs.                                                          |
| `cellSelected`                                                                                                          | A cell inside the selected range (`cellNavigation`). Styled kits use their own token.                                     |
| `cellSpan`                                                                                                              | A spanned cell (`cellSpan()` feature). `data-cell-span` is on the element (`"2x1"`). Default look is centered + one fill. |
| `filtersAnchor`                                                                                                         | The popover anchor wrapper around the trigger.                                                                            |
| `filtersPopover`                                                                                                        | The anchored popover card (`filtersMode="popover"`).                                                                      |
| `filtersBackdrop`                                                                                                       | The drawer backdrop (`filtersMode="drawer"`).                                                                             |
| `filtersPanel`                                                                                                          | The drawer panel.                                                                                                         |
| `filtersHeader` / `filtersTitle` / `filtersClose`                                                                       | Panel header, its title, and the close button.                                                                            |
| `filtersBody` / `filtersFooter`                                                                                         | The panel content area and its action row.                                                                                |
| `filtersClear` / `filtersDone`                                                                                          | The clear-all and done/apply buttons.                                                                                     |
| `filterField` / `filterLabel`                                                                                           | One auto-built field's wrapper and its caption.                                                                           |
| `filterInput` / `filterSelect` / `filterOperator`                                                                       | Text/date/number inputs, the `select` widget, and a range field's operator `<select>`.                                    |
| `filterCheckboxGroup` / `filterCheckbox`                                                                                | A `multiSelect` checkbox list and one option.                                                                             |
| `filterChecklist` / `filterChecklistSearch` / `filterChecklistActions` / `filterChecklistList` / `filterChecklistCount` | Excel-style checklist and its search, actions, list, and counts.                                                          |
| `filterHeaderRow` / `filterHeaderTrigger` / `filterHeaderCell` / `filterHeaderInput` / `filterHeaderMenu`               | Compact header filter row, funnel overlay trigger, one cell, its input, and the multi-select menu.                        |
| `filterOptionsLoading`                                                                                                  | The placeholder shown while async options load.                                                                           |

### Chips

| Part         | Element                       |
| ------------ | ----------------------------- |
| `chips`      | The active-filter chip strip. |
| `chip`       | One removable chip.           |
| `chipRemove` | A chip's remove button.       |

### Column menu & resize

| Part                                                    | Element                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| `columnMenu` / `columnMenuButton` / `columnMenuPanel`   | The menu wrapper, trigger, and dropdown panel.              |
| `columnMenuHeader` / `columnMenuTitle`                  | The panel header and its title.                             |
| `columnMenuItem` / `columnMenuGrip` / `columnMenuLabel` | One column row, its drag grip, and its label.               |
| `columnMenuVisibility` / `columnMenuPin`                | The show/hide toggle and the pin control.                   |
| `columnMenuSeparator` / `columnMenuReset`               | The separator above the actions entry and the reset button. |
| `columnMenuAutoSize`                                    | The menu's "size columns to content" action.                |
| `resizeHandle`                                          | A header's drag/keyboard resize handle.                     |

### Saved views

| Part                         | Element                                        |
| ---------------------------- | ---------------------------------------------- |
| `viewsButton` / `viewsPanel` | The menu trigger and dropdown panel.           |
| `viewsItem` / `viewsDelete`  | One view's apply button and its delete button. |
| `viewsInput` / `viewsSave`   | The view-name input and the save button.       |

### Selection & bulk actions

| Part                                                    | Element                                                 |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `bulkBar` / `bulkButton`                                | The selection toolbar and one bulk-action button.       |
| `selectAllBanner` / `selectAllText` / `selectAllButton` | The cross-page banner, its status text, and its action. |
| `selectionCell` / `checkbox`                            | A row's selection cell and the checkbox itself.         |

### Table

| Part                                   | Element                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `table` / `thead` / `tbody`            | The `<table>` and its sections.                                                              |
| `headerRow` / `headerCell`             | The header `<tr>` and one `<th>`.                                                            |
| `groupRow` / `groupCell`               | The grouped-header row and one spanning cell.                                                |
| `sortButton` / `sortIndex`             | A sortable header's button and its multi-sort badge.                                         |
| `row` / `cell`                         | One body `<tr>` and one `<td>`.                                                              |
| `actionsCell` / `actionButton`         | The trailing actions cell and one action button.                                             |
| `rowActionsTrigger` / `rowActionsMenu` | The 3-dot control and its menu (`rowActionsLayout="menu"`). Menu items reuse `actionButton`. |

### Row expansion

| Part                          | Element                                               |
| ----------------------------- | ----------------------------------------------------- |
| `expandHeader` / `expandCell` | The leading chevron header cell and body cell.        |
| `expandButton`                | The expand/collapse chevron (rows and cards).         |
| `detailRow` / `detailCell`    | The full-width detail `<tr>` and its spanning `<td>`. |
| `cardDetail`                  | The detail section inside an expanded mobile card.    |

### Inline cell editing

Opt-in via `editing()` — see [Inline cell editing](./cell-editing.md). When
editing is dormant these parts are never mounted.

| Part                 | Element                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `edit-cell-activate` | Invisible activate control (double-click / Enter / F2 begins edit). |
| `edit-cell-editor`   | Kit-native input / select while the cell is active.                 |

### Row grouping

Opt in with `groupingPanel()` from the kit's `/grouping-panel` subpath — see
[Row grouping](./row-grouping.md). The panel owns the grouped headers as well
as the configuration strip; when it is dormant these parts are never mounted.

| Part                             | Element                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `grouping-panel`                 | The dedicated grouping strip above the table.                                   |
| `grouping-drop-zone`             | A desktop insertion target for header/chip drag-and-drop.                       |
| `grouping-item`                  | One active grouping level: chip plus its following insertion target.            |
| `grouping-chip`                  | An active grouping field, with logical arrow-key movement and a remove control. |
| `grouping-add`                   | The Add grouping column select, present on desktop and mobile.                  |
| `grouping-aggregations`          | Active aggregation chips plus Add aggregation column and Restore defaults.      |
| `grouping-aggregation-item`      | One active aggregation: column name, operation select, remove.                  |
| `grouping-aggregation-operation` | That item's operation select.                                                   |
| `grouping-aggregation-remove`    | That item's remove control.                                                     |
| `grouping-aggregation-add`       | The Add aggregation column control.                                             |
| `grouping-aggregation-option`    | One checklist row.                                                              |
| `grouping-aggregations-restore`  | Restore defaults.                                                               |
| `grouping-remove-zone`           | Desktop drop target shown while dragging a grouping chip to remove it.          |
| `grouping-announcer`             | Polite live region for add, move, remove, and aggregation-change feedback.      |

| Part                | Element                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `group-row`         | Desktop group header `<tr>` (or antd's grouped row wrapper).          |
| `group-cell`        | The spanning `<td>` / `<th>` inside a group header (most kits).       |
| `group-footer-row`  | The row closing a group when `groupFooters` is set.                   |
| `group-footer-cell` | The spanning cell inside a group footer.                              |
| `group-footer-card` | Group footer block in the mobile card list.                           |
| `group-card`        | Group header block in the mobile card list.                           |
| `group-toggle`      | Expand / collapse chevron (`aria-expanded`, `expandGroup` labels).    |
| `group-label`       | The group's display label (bucket value).                             |
| `group-count`       | Leaf count beside the label (`labels.groupCount`).                    |
| `group-select`      | Tri-state checkbox over the group's leaf rows (when selection is on). |
| `group-aggregate`   | One per-group aggregate cell (`data-column` = column key).            |

### Mobile cards & summary

| Part                                     | Element                                            |
| ---------------------------------------- | -------------------------------------------------- |
| `cards` / `card`                         | The card list and one card.                        |
| `cardRow` / `cardLabel` / `cardValue`    | One label/value line inside a card.                |
| `summary` / `summaryRow` / `summaryCell` | The `<tfoot>`, its `<tr>`, and one summary `<td>`. |
| `summaryCard`                            | The trailing summary card in the mobile list.      |

### Footer, pagination & states

| Part                           | Element                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `footer` / `pager`             | The footer bar and the trailing pager group (page-of label + numbered pages).               |
| `pagePrev` / `pageNext`        | The previous and next page buttons.                                                         |
| `pageNumber` / `pageEllipsis`  | Each numbered page (the current one carries `aria-current="page"`) and the "…" elision gap. |
| `loadMore` / `loadMoreButton`  | The infinite-mode sentinel area and its button.                                             |
| `empty` / `emptyClear`         | The empty state and its clear-filters button.                                               |
| `loading` / `refreshIndicator` | The first-load skeleton and the background-refresh bar.                                     |
| `error` / `retryButton`        | The error state and its retry button.                                                       |

### View controls

| Part                                 | Element                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| `densityToggle` / `fullscreenToggle` | The `densityChooser()` and `fullscreen()` toolbar buttons. |
| `printButton`                        | The Print button drawn by `print(onPrint, true)`.          |
| `undoButton` / `redoButton`          | The Undo and Redo buttons from `undoRedoButtons()`.        |
| `addRow`                             | The Add-row toolbar button.                                |

### Export progress

| Part                                               | Element                                                     |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `exportProgressSurface`                            | The server-export progress card.                            |
| `exportProgressBar` / `exportProgressMessage`      | The determinate or indeterminate bar and the host's detail. |
| `exportProgressActions`                            | The card's action row.                                      |
| `exportProgressCancel` / `exportProgressRetry`     | Cancel while running; Retry after a failure.                |
| `exportProgressDownload` / `exportProgressDismiss` | The finished download link and the Dismiss control.         |

### Command palette, context menu, side panel & status bar

| Part                                                       | Element                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `commandPalette` / `commandInput`                          | The `commandPalette()` surface and its search box.       |
| `commandItem` / `commandEmpty`                             | One command row and the "nothing matched" line.          |
| `contextMenu` / `contextMenuItem` / `contextMenuSeparator` | The `contextMenu()` menu, one entry, and a divider.      |
| `sidePanel` / `sidePanelTab` / `sidePanelClose`            | The `sidePanel()` dock, one tab in its strip, and close. |
| `statusBar` / `statusItem`                                 | The `statusBar()` strip and one figure inside it.        |

A few purely structural nodes (`scroll-box`, `virtual-spacer`, the skeleton
internals) expose only the `data-adapttable-part` attribute.

### The structural parts every adapter names

Seven part names are guaranteed in **every** kit, on the same element in each —
so one selector works whichever adapter an app mounts:

| Part                        | Element                          |
| --------------------------- | -------------------------------- |
| `table` / `thead` / `tbody` | The `<table>` and its sections.  |
| `row` / `cell`              | One body `<tr>` and one `<td>`.  |
| `header-cell`               | One header `<th>`.               |
| `toolbar`                   | The toolbar row above the table. |

Two kit-specific shapes to know: antd owns its `<td>` for the selection column,
so `selection-cell` sits on a wrapper one element inside it; and a bounded
height makes antd split the grid into a header table and a body table, both
named `table`. Everything else in the map above is per-adapter — a themed kit
names what it renders.

## Slots

Replace whole sub-components on any adapter:

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  slots={{ empty: <MyEmptyState />, skeleton: <MySkeleton /> }}
/>
```

`skeleton` replaces the first-load skeleton; `empty` replaces the
empty-state.

### The error state

`error` replaces the load-failure state. It takes a node like the others, and
it also takes a function — because an error state is _about_ something:

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  slots={{
    error: ({ error, retry, retrying }) => (
      <MyAlert message={error.message} onRetry={retry} busy={retrying} />
    ),
  }}
/>
```

`retry` is `undefined` when the source has nothing to ask again — a static
`data` array, for instance — so hide your retry control when it is missing
rather than rendering one that does nothing. `retrying` is true while a retry
is already in flight.

Leave the slot off and the built-in state renders, retry button included;
translate it via the `errorTitle` / `errorMessage` / `retry` labels.

### Two empty states, one optional slot

A table is empty for two different reasons, and they deserve different words:
there is no data at all, or a search and filters matched nothing. The built-in
filtered state says so and offers a **clear all filters** action.

`empty` covers both. Add `noResults` when the filtered case needs its own
message — including its own way back:

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  slots={{
    empty: <NoInvoicesYet />,
    noResults: <NothingMatched onClear={clearFilters} />,
  }}
/>
```

Set only `empty` and it covers both states — but the
built-in clear-filters action goes with it, so give your replacement a way to
reset the query.

## Toolbar and status bar

Every view control, the toolbar order and feature notices are on
[toolbar and view controls](./toolbar-and-view-controls.md).

`toolbar` fills the middle of the toolbar — between the search input and
the built-in buttons. `toolbarSlots` fills the two ends:

```tsx
<DataTable
  toolbarSlots={{ start: <BackButton />, end: <HelpLink /> }}
  toolbar={<ViewSwitcher />}
  …
/>
```

The order is: `start` · Search · (mobile sort select) · `toolbar` ·
Filters · Saved views · Columns · Density · Export · Fullscreen · Print ·
Undo/Redo · Add · `end` · Rows per page, in every kit.

`undoRedoButtons()` adds Undo and Redo to that row. They render only when
`editHistory()` is composed, and they disable rather than disappear when there is
nothing to put back — a toolbar that reflows while someone is working is
worse than a button that is briefly unavailable. The keyboard shortcuts
stay the always-on path; the buttons are the visible one, for users who will
not find Ctrl+Z.

```tsx
import {
  editing,
  editHistory,
  undoRedoButtons,
} from "@adapttable/mantine/editing";
import { statusBar } from "@adapttable/mantine/status-bar";

<DataTable
  features={[
    editing(saveCell),
    editHistory(),
    undoRedoButtons(),
    statusBar(),
  ]}
  …
/>;
```

`statusBar()` puts a strip under the table: the row range, how many rows are
selected, and — with `selectionStats()` composed — what the selected cells add up
to. The range is the one the pagination footer shows, from the same
arithmetic, so the two never disagree. The strip hosts the selection figures
rather than repeating them, so turning it on does not print them twice.

Opted-in features that cannot run (virtualize on a paged table, pin under
grouping/tree rows, grouping the source cannot perform, `exportCsv()` with
`scope: "all"` and no full-export route, edits with no writer) show as
`FeatureNotice` items (`FeatureNoticeKind` is the union). They live on
`StatusBarChromeProps.notices` and `TableChrome.featureNotices`, and they
render in the status strip whenever `statusBar()` or `selectionStats()` is
composed — row and selected counts need `statusBar()`. The table's root
element always carries the active kinds in `data-adapttable-notices`.

`print(onPrint, true)` adds a Print button beside the view controls. It needs two
things, not one: the handler, and `true` as the second argument to draw the
button. Either alone draws nothing — a button that opens no dialog would be worse than
no button, and a handler on its own is the palette's Print command. The caption is `labels.print`, the same string the command
uses.

```tsx
import { printTable } from "@adapttable/core/pdf";
import { print } from "@adapttable/mantine/print";

<DataTable
  features={[print(() => printTable({ rows, columns }), true)]}
  …
/>;
```

All of them are off unless asked for: omit them from `features` and nothing renders and
nothing is bundled.

## Highlighting a row

After a save or an import, the row that changed is somewhere in a list of a
thousand. `useHighlight` marks it for a moment:

```tsx
import { useHighlight } from "@adapttable/react";
import { rowAppearance } from "@adapttable/mantine/row-appearance";

const highlight = useHighlight(true);

<DataTable
  features={[
    rowAppearance({
      rowClassName: (row) =>
        highlight.isRowHighlighted(row.id) ? "flash" : undefined,
    }),
  ]}
  …
/>;

// after a save
highlight.flashRow(saved.id);
```

The highlight is a class you compute through
`rowAppearance({ rowClassName })`, which every adapter honours — which means it works
in every kit and looks like the rest of your design system rather than
like ours.

Marks are keyed by row id, so one survives the sort, filter or page change
that moves the row. Flashing the same row again restarts its clock rather
than stacking.

`animated` is false when the user has asked for reduced motion. The mark
still appears and still clears — it holds steady, and holds longer, because a
steady mark is easier to miss than one that moves. Reduced motion means less
movement, not less feedback, so branch on `animated` to pick a class rather
than to skip the highlight:

```tsx
rowAppearance({
  rowClassName: (row) =>
    highlight.isRowHighlighted(row.id)
      ? highlight.animated
        ? "flash flash--animated"
        : "flash"
      : undefined,
});
```

`flashCell({ rowId, columnKey })` and `isCellHighlighted` do the same for one
cell, for a column's `Cell` renderer to read.

## Density and fullscreen

```tsx
import { DataTable } from "@adapttable/mantine";
import { standardFeatures } from "@adapttable/mantine/preset";

<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  features={standardFeatures()}
  …
/>;
```

`standardFeatures()` includes `densityChooser()` — the toggle works with no
`density` or `onDensityChange` from the host. The feature owns uncontrolled
state and starts at `"comfortable"`. To control density yourself, pass `density`
as the source of truth and `onDensityChange` to observe requests:

```tsx
import { densityChooser } from "@adapttable/mantine/density";
import { fullscreen } from "@adapttable/mantine/fullscreen";
import type { Density } from "@adapttable/mantine/density";

const [density, setDensity] = useState<Density>("comfortable");

<DataTable
  density={density}
  onDensityChange={setDensity}
  features={[densityChooser(), fullscreen()]}
  …
/>;
```

Pairing controlled density with `useDensityUrlState` keeps the choice in the
URL beside sort and filters, so a reload and a shared link both reproduce it:

```tsx
import { densityChooser } from "@adapttable/mantine/density";
import { fullscreen } from "@adapttable/mantine/fullscreen";
import { useDensityUrlState } from "@adapttable/react";

const { density, onDensityChange } = useDensityUrlState();

<DataTable
  density={density}
  onDensityChange={onDensityChange}
  features={[densityChooser(), fullscreen()]}
  …
/>;
```

`fullscreen()` adds a toggle. Fullscreen hides everything outside the table,
which is what makes it useful and also what breaks overlays: a menu
portalled to `document.body` sits inside the part being hidden, still
mounted and still focused. The table's own overlays are re-pointed at the
fullscreen element automatically. Adapter code that portals its own reads
`DataTableShellResult.fullscreen.container` from `@adapttable/react/adapter`
and uses it while it is set; host overlays portalled outside the table are
hidden while fullscreen is on.

The toggle hides itself where the browser will not allow fullscreen — an
embedded webview, a sandboxed frame — because a control that cannot work is
worse than no control.

## Command palette

The full reference is [command palette and context menu](./command-palette.md).

```tsx
import { commandPalette } from "@adapttable/mantine/command-palette";
import { print } from "@adapttable/mantine/print";
import { printTable } from "@adapttable/core/pdf";

<DataTable
  features={[
    commandPalette(),
    print(() => printTable({ rows, columns })),
  ]}
  …
/>;
```

Cmd/Ctrl+K opens a palette listing the built-in commands the composed
features provide (Print, Export, Clear filters), followed by any `commands`
you register. Type
to filter, arrows to move, Enter to run, Escape to close.

Its entries are the same objects the context menus take. That is the point:
an action written once appears in both, and cannot gain a condition in one
and not the other.

```tsx
import { commandPalette } from "@adapttable/mantine/command-palette";

<DataTable
  features={[
    commandPalette({
      commands: [{ key: "audit", label: "Open audit log", onSelect: open }],
      shortcuts: [{ chord: "ctrl+shift+p", command: "command-palette" }],
    }),
  ]}
  …
/>;
```

Shortcuts are data, not a key handler, because remapping is not a
preference — your app may already own Cmd/Ctrl+K. `mod` means Cmd on a Mac
and Ctrl elsewhere, so one chord is right on both. `shortcuts: []` binds no
key, and the palette then stays closed. See
[command palette and context menu](./command-palette.md).

`printTable` opens a browser dialog, so printing is the host's call to make.
Compose `print(onPrint)` and it becomes a command; pass `true` as the second
argument to also draw the toolbar button; leave it out and it is not offered.

## Context menus

The full reference is
[command palette and context menu](./command-palette.md#context-menu).

```tsx
import { contextMenu } from "@adapttable/mantine/context-menu";

<DataTable features={[contextMenu()]} … />;
```

Right-click a header and it offers that column's actions — sort, filter,
hide. Right-click a cell and it offers copy. Each entry appears only
when the handler behind it is wired and the column allows it: a menu that
lists "Hide column" over a column locked against hiding reads as broken
rather than as forbidden.

Every route in works, because a right-click-only menu is one half the people
who need it cannot reach:

| Route    | Opens with                           |
| -------- | ------------------------------------ |
| Pointer  | Right-click                          |
| Keyboard | Shift+F10, or the dedicated menu key |
| Touch    | Press and hold                       |

Escape closes it and puts focus back where it came from. A press that travels
more than a few pixels is a scroll, not a menu.

Add your own entries with `{ items }`. They land behind a divider, so a
custom action is never mistaken for a built-in one:

```tsx
import { contextMenu } from "@adapttable/mantine/context-menu";

<DataTable
  features={[
    contextMenu({
      items: (target) =>
        target.kind !== "header"
          ? [{ key: "audit", label: "Open audit log", onSelect: () => open(target.rowId) }]
          : [],
    }),
  ]}
  …
/>;
```

## Side panel

A popover is right for a control you touch once and dismiss. It is wrong for
setting a table up — choosing columns, building a filter, arranging a pivot —
because that is iterative: change one thing, look at the rows, change
another. A popover closes when you look away, and the rows are behind it
while it is open.

`sidePanel()` docks that work beside the table instead. It is controlled,
because the control that opens it is yours — `toolbarSlots` is where it
usually goes:

```tsx
import { sidePanel } from "@adapttable/mantine/side-panel";

const [panel, setPanel] = useState<string | null>(null);

<DataTable
  toolbarSlots={{
    end: <button onClick={() => setPanel("filters")}>Settings</button>,
  }}
  features={[
    sidePanel({
      panels: [
        { key: "filters", label: "Filters", content: <MyFilters /> },
        { key: "columns", label: "Columns", content: <MyColumnList /> },
      ],
      open: panel,
      onOpenChange: setPanel,
      side: "end",
    }),
  ]}
  …
/>;
```

`SidePanelOptions` types it and `SidePanelEntry` is one panel — a `key`, a
`label` and the `content` to show. With more than one panel the labels
become a real tab strip: one tab stop for the whole strip, arrow keys that
wrap and carry the selection, Home and End. Escape closes from anywhere
inside. Putting focus back afterwards is the opener's job, since only it
knows where focus was.

`side` picks the edge — `"end"` (the default) is the right in a
left-to-right table and the left in a right-to-left one. Omit `sidePanel()`
from `features` and nothing renders, nothing is bundled, and the table's markup is
unchanged.

Adapters build their panel over `SidePanelChrome` / `SidePanelSlots` /
`SidePanelFrameProps` / `SidePanelTabProps` / `SidePanelCloseProps` and dock
it with `SidePanelLayout` / `SidePanelLayoutProps`, all from
`@adapttable/react/adapter`.

## Density

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  density="compact"
/>
```

`"comfortable"` (default) is the roomy layout; `"compact"` tightens row
height and padding. With `densityChooser()` composed and no controlled
`density` prop, the feature owns the choice and defaults to `"comfortable"`.
Each adapter maps density to its kit's table size — MUI `"comfortable"` →
`medium` / `"compact"` → `small`, antd → `middle` / `small`, Radix `"2"` /
`"1"`, Base UI `"2"` / `"1"` — and Chakra, antd, Radix and Base UI take an
explicit `size` prop that overrides the mapping (e.g. antd `size="large"`).
MUI always follows density.

## Export

CSV by default, spreadsheets when you ask for them — one factory, one set of
scopes, [one button](#spreadsheet-xlsx-export).

Opt in with `exportCsv()` from `@adapttable/<kit>/export` to render a kit-native **Export CSV** button next to
Filters / Columns. The file mirrors the current view's data — the active search, filters,
and sort — with **the full exportable column set in display order,
regardless of viewport**: the same button produces the same file on phone
and desktop (`hideOnMobile` never shrinks an export).

Cells that a spreadsheet would execute as formulas (`=`, `+`, `-`, `@`,
tab or carriage-return prefixes) are neutralised with a leading `'` by
default; pass `escapeFormulas: false` in the options object if you need
raw output for a non-spreadsheet pipeline.

```tsx
import { DataTable } from "@adapttable/mantine";
import { exportCsv } from "@adapttable/mantine/export";

<DataTable
  data={people}
  columns={columns}
  rowKey={(r) => r.id}
  features={[exportCsv()]} // defaults: export.csv, current page
/>;

<DataTable
  data={people}
  columns={columns}
  rowKey={(r) => r.id}
  features={[exportCsv({ filename: "people.csv", scope: "all" })]}
/>;
```

- `scope: "page"` (default) — the current page / loaded slice.
- `scope: "all"` — the full filtered+sorted set when the source can reach it
  (frontend can). A source-owned route requires both actual
  `allFilteredRows` and a capability contract that permits `"all"`; the
  declaration alone does not retrieve rows. Otherwise `request` or `fetchAll`
  must fetch the rest — see
  [source capabilities](./data-tiers.md#what-a-source-can-do--capabilities).

  **"All" means every row that matched the filters, not every row on screen.**
  Display state never shrinks an export: a collapsed tree folder still writes
  the rows inside it, and pagination does not decide what leaves the table.
  A grouped export keeps its headers and totals around those rows.

  A server-backed table holds one page, so `"all"` has to be answered by
  fetching. There are two ways, and no third:

  - `request` — hand the whole thing to your backend. The `ExportRequest` it
    receives carries an `ExportQuery` with `page` and `limit` **undefined** for
    this scope, precisely so a handler cannot answer with one page.
  - `fetchAll` — let the table page the query itself and build the file in the
    browser. It is opt-in because it is a loop of requests, and capped because
    an unbounded one can hang a tab: `maxRows` defaults to
    `EXPORT_FETCH_ALL_MAX_ROWS` (50,000), and `onCapped` fires if the cap
    stopped the export short. `fetchAllExportRows` is the same walk, exported
    for hand-built downloads.

  With no executable route, the Export button stays rendered but disabled,
  with the localized reason on the control, and in the status bar when one is
  composed. Writing the
  current page as if it were everything is the one answer that is always wrong.

- `scope: "selected"` — the ticked rows, in table order. Selection is a set of
  ids, so a row checked on page 1 is still in the file while page 3 is on
  screen. Nothing ticked writes a header-only file.
- `scope: "range"` — the highlighted cell rectangle from
  [cell navigation](./cell-navigation.md). A rectangle names its own columns,
  so it decides them and `columns` is not consulted. With nothing selected the
  current page is exported instead.

`columns` chooses the file's shape independently of the rows:

- `columns: "visible"` (default) — what the user can see, so the file matches
  the screen.
- `columns: "all"` — every defined column, including ones hidden through the
  column menu, for a complete extract.
- `columns: ["name", "email"]` — exactly these, in this order. A key matching
  no column is ignored, so a stale saved config cannot break the button.

The synthetic actions column is never exported under any of them.

### Exporting a different value than the screen shows

A cell formatted for reading is worse than useless in a spreadsheet: `"$1,240.00"`
cannot be summed and `"3 days ago"` cannot be sorted. Give the column an
`exportValue` and the file carries the value underneath while the table keeps
rendering the friendly version:

```tsx
{
  key: "budget",
  accessor: (row) => money.format(row.budget),  // what the user reads
  exportValue: (row) => row.budget,             // what the spreadsheet gets
}
```

Columns without one export what the table shows, so this is only needed where
the two genuinely differ. Formula escaping still applies to whatever is
returned.

### Spreadsheet (XLSX) export

The full reference — cell typing, widths, sheet names and Node builds — is
[Excel (XLSX) export](./export-xlsx.md).

The same button writes a real `.xlsx` when you hand it the spreadsheet writer:

```tsx
import { xlsxWriter } from "@adapttable/core/xlsx";
import { exportCsv } from "@adapttable/mantine/export";

<DataTable
  data={people}
  columns={columns}
  rowKey={(r) => r.id}
  features={[
    exportCsv({ writer: xlsxWriter({ sheetName: "People" }), scope: "all" }),
  ]}
/>;
```

Every scope and column option above works unchanged — which rows and columns
leave the table is decided before the format is asked for anything.

The button relabels itself: it reads **Export XLSX** here, not "Export CSV",
from `labels.exportFile(format)` — translated in every bundled locale, and
given a caption for a format nobody planned for (a custom writer calling itself
`tsv` gets "Export TSV"). CSV keeps `labels.exportCsv`, so its existing
translations and any wording you overrode are untouched.

Three differences from CSV, all in your favour. Numbers, booleans and `Date`
values stay **typed**, so a spreadsheet can sum a column, filter a date, and
sort a checkbox instead of reading text that looks like one; text that looks
numeric stays text, so a postal code of `01730` arrives as `01730` rather than
`1730`; and the sheet is styled for reading — a frozen bold header, column
widths from the table, group and tree rows outlined at their depth, group
footers and a `summaryRow` grand total in bold. Formula escaping is not needed
and is ignored: XLSX keeps formulas in their own element, so a cell reading
`=CMD()` is displayed, never executed.

A grouped or tree-shaped table exports that structure, not a denormalised
leaf list: group headers and footers travel with the leaves, collapsed groups
stay collapsed on `scope: "page"`, and `scope: "all"` / `"selected"` include
leaves that were folded or paged away — then `"selected"` keeps only the
groups that still have a selected leaf. A `scope: "range"` export stays a
rectangle — the selection already named its shape. Mobile cards use the same
button and the same file; `hideOnMobile` never shrinks an export.

`@adapttable/core/xlsx` is its documented entry, because a table that
exports CSV should not ship a ZIP encoder: nothing XLSX-related reaches a
bundle that does not import `xlsxWriter`. There is no new dependency either way — `buildTableXlsx` writes
the workbook by hand.

Any format is reachable the same way. An `ExportWriter` is an extension and a
`build` function over the resolved values (`ExportWriteContext` in,
`ExportPayload` out); `csvWriter` is the built-in one, and `downloadExportFile`
hands a built payload to the browser. A writer receives an `ExportTable` —
headers, keys, and one array of values per row, resolved once by
`buildExportTable` — rather than rows and columns, so two formats of the same
table cannot disagree about what a cell contains, and a writer needs no type
argument.

### Before and after the file is written

```tsx
import { exportCsv } from "@adapttable/mantine/export";

<DataTable
  features={[
    exportCsv({
      onBeforeExport: ({ rows, columns, filename }) => {
        if (rows.length > 50_000) return false; // cancel
        return { filename: `people-${rows.length}.csv` }; // or rename
      },
      onAfterExport: ({ csv, file, filename }) =>
        track("export", { filename }),
    }),
  ]}
  …
/>;
```

`onBeforeExport` runs once the rows and columns are resolved and before
anything is written — the only moment where the file's contents are known and
nothing has happened yet. Return `false` to cancel, `{ filename }` to rename,
or nothing to continue — a cancelled export builds no file at all.
`onAfterExport` receives the text that was written as `csv`, and the built file
as `file`; a binary format leaves `csv` empty and carries its bytes in
`file.parts`.

Headless helpers remain available: `rowsToCsv`, `downloadCsv`, and
`downloadTableCsv` from `@adapttable/core`.

### Exporting from your backend

Past a certain size the browser is the wrong place to build the file: the rows
are not all loaded, holding them would cost more memory than the tab has, and
the work blocks the main thread. `onExportAll` hands the page-free current view
to the server and keeps the job visible:

```tsx
import { exportCsv } from "@adapttable/mantine/export";

<DataTable
  features={[
    exportCsv({
      scope: "all",
      onExportAll: async (query, controls) => {
        const res = await fetch("/api/people/export", {
          method: "POST",
          body: JSON.stringify(query),
          signal: controls.signal,
        });
        const job = await res.json();
        controls.setProgress?.(job.progress);
        controls.setMessage?.(job.message);
        return job.url ? { url: job.url } : undefined;
      },
    }),
  ]}
  …
/>;
```

`query` carries search, flat and nested filters, single and multi-sort,
grouping, visible and requested column keys, format, and filename — but no page
window and no rows. `controls.signal` powers Cancel; `setProgress(0–100)` and
`setMessage(text)` update every kit's progress surface. No progress means an
indeterminate indicator. Resolve `{ url }` and the table offers the download;
resolve nothing when the host delivered it another way; reject for a localized
error with Retry.

The existing `fetchAll` route still pages in the browser and keeps its 50,000
row default cap. `onExportAll` is the documented route past it. The generic
`request` callback also remains for backend takeover of page, selected, or
range exports without progress. Host-owned routes do not run
`onBeforeExport`/`onAfterExport`, because the table never builds their file.

The full settle, cancellation, and accessibility contract is in
[Browser and server-built exports](./exporting.md).

### The export pipeline (headless)

The export path is exported end to end: `exportableColumns` filters the
visible layout to columns with exportable values, `resolveExportColumns`
applies a column scope to them, `buildTableCsv` turns rows + columns into CSV
text (`RowsToCsvOptions` controls `delimiter`, `escapeFormulas` and
`getValue`; `downloadCsv` adds the UTF-8 BOM Excel needs),
`resolveExportCsv` normalizes the export options (`ExportCsvOptions`), and
`makeExportCsvHandler` wires all of it to a download handler the toolbar button
calls. Custom toolbars can reuse any stage.

Formats plug in at the last stage only. `csvWriter` and `xlsxWriter` are both
`ExportWriter`s — given an `ExportWriteContext` (an `ExportTable` of resolved
values, plus the filename) they return an `ExportPayload`, which
`downloadExportFile` writes. Nothing earlier in the pipeline knows which format
is in play, and `matrixToCsv` is the CSV half of it for anyone assembling values
themselves.

Custom adapters bind the button with `useExportHandler` from
`@adapttable/react/adapter`: it takes the handler above and returns an
`ExportHandlerState` — `onExportCsv`, `exportBusy`, `exportLabel`,
`exportDisabled`, `exportDisabledReason`, `exportStatus`,
`exportProgressState` and `exportAnnouncement` — which is how every
built-in adapter gets identical single-flight behaviour.

Four supporting types: `ExportRowScope` and `ExportColumnScope` name the two
scope unions, `ExportInfo` is what the lifecycle hooks receive, and
`ExportContext` carries the selection, full column set and highlighted range
that `scope: "selected"`, `columns: "all"` and `scope: "range"` need — the
adapters pass all of it automatically, and only a hand-built
`downloadTableCsv` call has to supply it.

## Sticky header, offset & scroll box

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  stickyHeader // keep the desktop header pinned while the page scrolls
  stickyTop={56} // offset under your app header (also offsets the toolbar)
  maxHeight={420} // fixed-height scroll box instead of page scroll
/>
```

`maxHeight` turns the table into a scroll box that also scrolls sideways —
the header and pinned columns stick within it, which is what makes column
pinning visibly stick. `scrollToTopOnChange` (default `true`) scrolls back
to the table when search/filter/page changes, with `scrollTopGap` (default
`8`) of breathing room below sticky chrome.

### The surface behind sticky and pinned cells (Mantine)

A sticky header and pinned columns need an opaque background, or scrolled rows
show through them. That colour and the hairline under the header come from two
CSS variables, so a panel whose surface is not the page background can say so:

```css
.my-dark-panel {
  --adapttable-surface: #101418;
  --adapttable-header-border: #2b3238;
}
```

They default to `--mantine-color-body` and `--mantine-color-default-border`,
so tables look the same until you set them. Declare them on any ancestor of
the table.

## Desktop table assembly

The six HTML kits (Mantine, MUI, Chakra, Radix, Base UI, Unstyled; shadcn
follows Unstyled) paint from one shared plan on
`@adapttable/react/adapter`. Ant Design stays on its native `<Table>`.

```ts
import {
  createDesktopRow,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  useDesktopTableAssembly,
} from "@adapttable/react/adapter";
```

`useDesktopTableAssembly(props, options?)` takes
`DesktopAssemblyProps` plus optional `DesktopAssemblyOptions` (mostly
`DesktopChromeWidths` for the reserved selection / expansion / actions
columns — defaults `DESKTOP_SELECTION_WIDTH`, `DESKTOP_EXPANSION_WIDTH`,
`DESKTOP_ACTIONS_WIDTH`) and returns a `DesktopTableAssembly`: header
leaves (`DesktopHeaderLeaf`), pin state (`DesktopTablePin`), and body
slots (`DesktopBodySlot` — rows as `DesktopRowSlot`, groups as
`DesktopGroupSlot` / `DesktopGroupEntry`, extras as `DesktopExtraSlot`,
virtual pads as `DesktopVirtualPadSlot`). `createDesktopRow` is the
memoized row the kits mount; `DesktopRowWiring` is the per-row bundle it
receives. Layout changes land once in the plan; each kit still owns
pixels.

`tableRenderModel` and `getRowProps` stay first-class — this helper is
add-only.

## Theming per kit

The core is style-free: wrap your app in the kit's provider and AdaptTable
renders with that kit's real components, following its theme and dark mode
(`prefers-color-scheme`) automatically.

## Animations

`animate` works on **every adapter** — a dependency-free row/card entrance
stagger that honours reduced motion. Rolling your own? Every animatable
row/card carries a `data-stagger` attribute, so leave `animate` off and target
those elements with GSAP/Framer Motion.

Kit-specific knobs:

- **MUI** — `className` lands on the root `<Paper>`; table size follows
  density.
- **Chakra** — `accentColor` colors primary accents (buttons, badges);
  `size` (`"sm" | "md" | "lg"`, default `"md"`).
- **Radix / Base UI** — `accentColor` colors primary accents; `size`
  (`"1" | "2" | "3"`).
- **Ant Design** — `size` (`"small" | "middle" | "large"`), `bordered` for
  cell borders, `className` on the wrapper. The virtualized scroll area is
  bounded by the shared `maxHeight` prop.
- **Unstyled** — no provider needed; theme entirely through `classNames`,
  the `data-adapttable-part` hooks above, and your own CSS variables /
  `data-theme`.

## Custom cells

Pass a `Cell` component (receives `{ row, rowIndex }`; define it at module
level so its identity is stable) or a lighter `accessor`:

```tsx
import type { CellProps } from "@adapttable/core";

function StatusCell({ row }: CellProps<Person>) {
  return (
    <Badge color={row.status === "active" ? "green" : "gray"}>
      {row.status}
    </Badge>
  );
}

const columns = [
  { key: "name", sortable: true },
  { key: "status", Cell: StatusCell },
  {
    key: "salary",
    accessor: (r: Person) => formatMoney(r.salary),
    align: "end",
  },
];
```

See the [Columns guide](./columns.md) and the
[ColumnDef table](./api.md#columndef) for the full column surface
(`sortValue`, `i18n`, `group`, `hideOnMobile`, …).
