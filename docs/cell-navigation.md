# React data grid navigation — range selection, copy, paste and fill

Use arrow keys to navigate cells, select a range, copy and paste spreadsheet
values, or extend values with a fill handle. This guide also covers find-in-table,
selection statistics and accessible focus. For host-owned validation and saving,
see [cell editing](./cell-editing.md).

A table with a hundred cells should not be a hundred tab stops. Compose
`cellNavigation` from `@adapttable/<kit>/cell-navigation` and the table becomes
**one** tab stop whose interior is reachable by arrow keys, with correct ARIA
grid semantics and a screen reader that says where you are. See
[feature composition](./features.md).

**Related:** [Accessible React data table](./accessibility.md) ·
[Cell editing](./cell-editing.md) · [Virtualization](./virtualization.md) ·
[Columns](./columns.md)

## Copy and cut, the way a spreadsheet reads it

**Ctrl/Cmd+C** copies the selected rectangle as tab-separated text — the format
Excel, Google Sheets, Numbers and LibreOffice all read — so a paste lands in
columns rather than one cell. Cells carrying a tab, a newline or a quote are
quoted the way those applications quote them.

Values resolve exactly as an export's do, `exportValue` included, so a copy and
a downloaded file cannot disagree about what a cell contains.

**Ctrl/Cmd+X** copies the same text and then calls `onCellCut(range)`. The table
clears nothing itself: what "cut" removes is your decision, and a cut that
emptied cells before the clipboard accepted them would lose the data outright.
With [`contextMenu()`](./command-palette.md#built-in-entries) composed, the
cell menu offers the same Cut.

Either way the outcome is announced — `labels.gridRangeCopied` on success,
`labels.gridRangeCopyFailed` when the browser refuses (the Clipboard API needs a
secure context and can be denied). With nothing selected, both keys are left to
the browser.

Headless: `clipboardRangeText` builds the text and `writeClipboardText` writes
it, reporting whether it landed rather than throwing.

## Pasting a spreadsheet back in

**Ctrl/Cmd+V** parses what a spreadsheet put on the clipboard and commits it as
ordinary cell edits — through your `editing()` handler, the same channel inline
editing uses:

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import { editing } from "@adapttable/mantine/editing";

<DataTable
  data={rows}
  rowKey={(row) => row.id}
  features={[
    cellNavigation(),
    editing((row, key, value) => save(row, key, value)),
  ]}
  columns={[{ key: "budget", header: "Budget", editable: true }]}
/>;
```

That is the whole wiring: a table that can be edited can be pasted into. Each
edit is the same thing an inline commit produces — same `parseValue`, same
shape, same handler — so paste is not a second editing route, and whatever you
wrap around a single-cell commit already covers a paste of two hundred.

To take the batch whole instead — one server round trip, one undo entry — set
`onCellPaste`, which takes precedence:

```tsx
<DataTable
  data={rows}
  rowKey={(row) => row.id}
  features={[cellNavigation(), editing(commit)]}
  onCellPaste={(edits) => saveAll(edits)}
  columns={[{ key: "budget", header: "Budget", editable: true }]}
/>
```

The **clipboard's shape wins** over the selection's: pasting a 3×2 block into one
focused cell writes 3×2, as every spreadsheet does. Cells landing outside the
loaded rows or the rendered columns are dropped rather than invented, and a
column that is not `editable` is skipped — a paste is an edit, and an edit into a
read-only column is not one.

The table writes nothing itself. Applying the edits stays yours, which is what
keeps a paste undoable, validatable and cancellable on your terms. The outcome
is announced through `labels.gridRangePasted`, or `labels.gridRangePasteFailed`
when the browser will not hand over the clipboard.

Headless: `readClipboardText` reads it, `parseClipboardTable` parses it, and
`pasteRangeEdits` maps it onto a range.

## The fill handle

Select a cell or a block and a small square appears on its bottom corner. Drag
it and the selection's values carry on — down, up, or sideways, whichever way
the drag mostly goes. The cells it would write are highlighted before anything
is committed, so the preview and the result cannot disagree.

**Two or more numbers a constant step apart continue the series** (1, 2 → 3, 4);
anything else repeats in order (Mon, Tue → Mon, Tue). A single number repeats
rather than counting — one value carries no step, and guessing `+1` there is the
behaviour spreadsheets are cursed for.

**Ctrl/Cmd+D** is the keyboard route: the selection's top row carries into the
rest of it. The handle itself is not a tab stop, because the grid is one tab
stop and a focusable square inside it would break that; the key press announces
what it wrote through `labels.gridRangeFilled`.

The edits arrive exactly as a paste's do — one call per cell through
`editing()`, or `onCellFill` for the batch — so the handle appears as soon as a
table can be edited, and never when it cannot:

```tsx
<DataTable
  data={rows}
  rowKey={(row) => row.id}
  features={[cellNavigation(), editing(commit)]}
  columns={[{ key: "budget", header: "Budget", editable: true }]}
/>
```

The square paints in the cell's own text colour; `--adapttable-fill-handle`
changes it. In RTL it sits on the row's inline end, which is the left, and a
sideways drag follows the same mirroring the arrow keys do.

Headless: `fillDirection`, `fillTargetRange` and `fillRangeEdits`;
`FillHandleChrome` passes the active corner to an adapter-owned handle.

## Find in table

Compose `findInTable` from `@adapttable/<kit>/find-in-table` and **Ctrl/Cmd+F**
opens a find bar over the table:

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import { findInTable } from "@adapttable/mantine/find-in-table";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[cellNavigation(), findInTable()]}
/>;
```

Find needs `cellNavigation()`: the shortcut, the marks and the walk all live
on the grid. Without it, only a link carrying `find` opens the bar.

Find is not [search](./search.md). The search box asks "show me only the rows that match", and
on a server tier it asks the server; find asks "where does this appear in what I
am looking at", leaves every row where it is, and walks the hits. Both can be on
at once.

Every hit is marked — `data-cell-match`, and `data-cell-match-current` on the
one you are standing on — painted in the amber every browser paints its own
find hits, because a find highlight is a browser convention rather than a
design-system token. `--adapttable-find-match` and
`--adapttable-find-match-current` change it; in `@adapttable/unstyled` the
`cellMatch` / `cellMatchCurrent` class hooks do (the shadcn preset fills them
in).

**Enter** walks forward, **Shift+Enter** back, **Escape** closes and clears.
Walking moves the table's focus with it, so the cell is scrolled into view,
announced, and left selected — a find that highlighted without going there would
leave you hunting for the highlight. The bar itself is one input, a count and
three buttons, all named through `labels.findInTable`, `findPlaceholder`,
`findMatchCount`, `findPrevious`, `findNext` and `findClose`.

Matching reads what a cell **shows**, so a column that renders a formatted date
is found by that date rather than by the ISO string underneath. Only the loaded
rows are searched: a hit the table cannot take you to would be a lie, so on a
paged table find covers the page you are on, and under virtualization it covers
what has been fetched. The **query** is part of the table's shareable URL state
(a `find` param beside `q`): opening a link that carries it reopens the bar,
runs the walk, and focuses the first hit. The current-match position stays
ephemeral — the receiving page's data may differ, so the query reproduces and
the cursor does not. Typing writes with replace-state after a short debounce so
browser history stays clean.

On mobile the cards are a list rather than a grid, so the bar opens and searches
but the hits are not marked; the desktop layout is where a cell can be pointed
at.

Headless: `findMatches`, `matchKeySet` and `stepMatch` in `@adapttable/core`,
`useFindInTable` in `@adapttable/react`. Each adapter mounts `FindBar` over
`FindBarChrome`.

## What the selection adds up to

Compose `selectionStats` from `@adapttable/<kit>/selection-stats` and a strip
under the table says what is selected:

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import { selectionStats } from "@adapttable/mantine/selection-stats";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[cellNavigation(), selectionStats()]}
/>;
```

> Count 12 · Sum 1,240.5 · Avg 103.4 · Min 12 · Max 900

Composing `selectionStats()` also adds the row-selection checkbox column. The
figures need `cellNavigation()`, which is what produces a cell range.

The count covers every selected cell; the arithmetic covers the numeric ones,
so a rectangle spanning a name column and a budget column still has a sum.
Numbers are read the way an export reads them — `exportValue` included — so the
total here and the total a spreadsheet computes from a paste of the same cells
cannot disagree. Booleans are not counted as numbers: summing a column of ticks
to 3 answers a question nobody asked.

A single cell shows nothing — it has no total worth reading, and a strip that
flickers in on every arrow press is noise. The strip is a status region, so a
screen reader reads the figures after the range announcement rather than
interrupting it, and every word is localizable (`labels.selectionCount`,
`selectionSum`, `selectionAverage`, `selectionMin`, `selectionMax`). Number
formatting follows the table's `locale`.

Selecting a column covers the LOADED rows, so the figures describe the 500 rows
in hand rather than the 100,000 in the dataset — the table never totals rows it
has never seen.

Headless: `selectionStats(options)` returns the figures;
`SelectionStatsChrome` passes formatted parts to an adapter-owned status bar.

## Selecting with the pointer, and whole columns

Drag across cells to select a block: the press anchors it, crossing a cell
extends it, and releasing anywhere — including outside the table — ends it.

A **column header** selects its whole column. Where the header already sorts,
sorting keeps the plain click and **Ctrl/Cmd+click** selects instead; on a header
that does not sort, a plain click selects. Ctrl/Cmd+click also extends an
existing selection to a second column.

A column selection covers the **loaded** rows. With 500 of 100,000 rows in hand
that is 500 cells, not 100,000 — the table never claims rows the browser has
never seen, because a copy or an export would then invent them.

### The header checkbox

`columnSelectionCheckbox()` adds a checkbox to every column header that selects
that column. The gesture above is unchanged; this is the same state reached two
ways it cannot be. A touchscreen has no Ctrl key to hold, and a gesture nothing
announces is a gesture nobody finds — so the control is what a finger taps and
what a screen reader reads, named `labels.selectColumn` plus the column's own
name ("Select column: Team", translated in every bundled locale).

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";
import { columnSelectionCheckbox } from "@adapttable/mantine/column-selection";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[cellNavigation(), columnSelectionCheckbox()]}
/>;
```

It needs `cellNavigation()`, because that is what makes a selection exist at all;
without it the header checkboxes do not render, and `columnSelectionCheckbox()`
alone adds only the row-selection column. Ticking selects the column, unticking clears
— nothing selected is the only state one checkbox can return to, since a
rectangle cannot lose a column out of its middle. A box reads as checked only
when the selection is exactly its column: inside a wider rectangle it stays
clear rather than saying the selection is one column when it is four.

Where the pointer can hover, the box holds its space and fades in on hover or
focus, so a wide header row is not a row of checkboxes and the layout never
moves; a selected column keeps its box on screen either way. Where there is no
hover — a touchscreen — it is always visible.

The control is `data-adapttable-part="column-select"` (`columnSelect` in
`@adapttable/unstyled`'s `classNames`), and it is each kit's own checkbox: core owns the layout, the
name, and keeping the click off the header underneath it, which would otherwise
sort the column the same click just selected.

Whenever the rectangle changes, the live region says what it now covers —
`"selected rows 1 to 2, columns 1 to 2, 4 cells"` — through
`labels.gridRangeSelection`, translated in every bundled locale. A single cell
stays silent: it announces itself already, and repeating "1 cell" on every arrow
press turns navigation into noise.

## The selection is visible, in each kit's own colour

Hold Shift while arrowing (or shift-click) and the extended range is filled with
the kit's own selected-cell token — Mantine's primary-light, MUI's
`action.selected`, Ant Design's active-item background, Radix's accent, and so
on. Nothing to configure.

Every selected cell also carries `data-cell-selected`, so CSS can target the
range directly. In `@adapttable/unstyled` there is no kit colour to borrow, so
the fill is yours through the `cellSelected` class hook (the shadcn preset sets
`bg-accent`).

## Example

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellNavigation } from "@adapttable/mantine/cell-navigation";

<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  features={[cellNavigation()]}
/>;
```

That is the whole opt-in. Omit it and nothing changes — see
[Off means absent](#off-means-absent).

## The keys

| Key                          | Where focus goes                                |
| ---------------------------- | ----------------------------------------------- |
| `↑` `↓` `←` `→`              | One cell, stopping at the edges                 |
| `Home` / `End`               | Start / end of the current row                  |
| `Ctrl`+`Home` / `Ctrl`+`End` | First / last cell of the whole grid             |
| `PageUp` / `PageDown`        | A viewport's worth of rows                      |
| `Enter` / `F2`               | Opens the editor, when the column is `editable` |
| `Ctrl`/`Cmd`+`C` / `X` / `V` | Copy, cut, paste the selected rectangle         |
| `Ctrl`/`Cmd`+`D`             | Fill the selection down from its top row        |
| `Tab`                        | Leaves the table — it is one stop, not hundreds |

Edges **stop rather than wrap.** Wrapping off the last column would move the
user to a different record without saying so; a table is not a spreadsheet.

Under `dir="rtl"` the left and right arrows swap, because arrow keys describe
the screen rather than the data — in a mirrored table the visually-next column
is the previous one. `Home` and `End` do not swap: they mean the start and end
of the row either way.

## What a screen reader hears

Focus alone announces a cell's contents, which is not navigation — "1,240" says
nothing about which column it belongs to or where it sits in a dataset whose end
you cannot see. So a live region announces the column, the cell's text, and the
absolute position:

> Budget, 1,240, row 40,002 of 100,000

The cell's text comes from [`columnText`](./columns.md), so a column whose cell
renders a badge or an avatar needs a `formatValue` to have anything readable.
The position phrase is localizable through `labels.gridCellPosition`, and ships
translated in every bundled locale.

## Virtualization

This is where a naive implementation is wrong and looks right. With 24 rows of
100,000 rendered, `aria-rowindex` must number rows **within the dataset**, not
within the window — otherwise assistive technology reports "row 3 of 24" while
the user is at row 40,000. AdaptTable carries absolute `aria-rowindex` /
`aria-colindex` and dataset-wide `aria-rowcount` / `aria-colcount`.

`Ctrl`+`End` on a 100,000-row table also asks for a cell that is not in the DOM
at all. Focus scrolls it into existence and lands on it once it mounts.

## Selecting a range

Hold **Shift** with any movement key, or shift-click a cell, and the selection
extends from where it began:

| Gesture                       | Result                          |
| ----------------------------- | ------------------------------- |
| `Shift`+`↑` `↓` `←` `→`       | Extend the rectangle one cell   |
| `Shift`+`Home` / `End`        | Extend to the row's start / end |
| `Shift`+`PageUp` / `PageDown` | Extend by a viewport of rows    |
| `Shift`+click                 | Extend to the clicked cell      |
| Any plain move                | Collapse back to a single cell  |

A range is stored as two corners — the **anchor** where it started and the
**head** where it reaches — not as a list of cells. That is what makes
Shift+Down twice then Shift+Up _shrink_ the range instead of starting a new one
upward, and what makes a 50,000-cell selection cost two numbers.

Selected cells carry `data-cell-selected` for styling. `aria-selected` appears
only once a real rectangle exists: marking every focused cell as selected would
tell a screen reader the table is in selection mode when the user has merely
arrowed around.

`cellNavigation({ onRangeChange })` tells the host the rectangle on mount and
whenever it changes — `null` when nothing beyond the focused cell is selected —
which is what a "sum of selection" readout of your own reads:

```tsx
const [range, setRange] = useState<CellRange | null>(null);

<DataTable
  {...props}
  features={[cellNavigation({ onRangeChange: setRange })]}
/>;
```

Headless: `useGridFocus({ onRangeChange })` reports every change, and
`gridFocus.range` holds the current rectangle — which is what
`exportCsv({ scope: "range" })` reads.

Headless: `CellRange` and `CellRangeBounds` are the shapes, `cellRangeBounds`
sorts the corners of a range dragged up or left, `isInCellRange` tests
membership, `cellRangeSize` multiplies rather than enumerating,
`extendCellRange` moves the head while keeping the anchor, `singleCellRange`
and `isSingleCell` handle the one-cell case, and `cellRangeIndices` enumerates
the rows and columns for an exporter — the one place that does.

## Mobile

Cell navigation applies to the **desktop table layout**. Mobile cards are a
list, not a grid: they keep list semantics, and arrow keys are not hijacked
there. This is deliberate — a card is one record's worth of stacked
label/value pairs, and a two-dimensional focus model does not describe it.

## Off means absent

Without `cellNavigation()` composed there is no `role="grid"`, no `tabIndex`, no key
handler, no live region, and no extra attributes. Not "disabled" — absent. A
core test asserts the markup is byte-identical to a table built without the
feature, and each of the eight adapters asserts there is no grid role and no
focusable cell.

Focus position is also deliberately **not** saved to the URL or a Saved View.
Where the keyboard is sitting is ephemeral UI state, not part of a view someone
would share.

## Headless

| Export                                                    | Purpose                                                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `useGridFocus` / `UseGridFocusOptions` / `GridFocusState` | The hook, its options, and the state it returns (`getGridProps`, `getCellPropsAt`, `getRowPropsAt`, `focusCell`, `announcement`). |
| `GridFocusAnnouncer` / `GridFocusAnnouncerProps`          | The live region, from `@adapttable/react/adapter`. Renders nothing when navigation is off.                                        |
| `moveGridFocus` / `GridFocusMove` / `GridBounds`          | The pure move arithmetic and its vocabulary — no React, no DOM.                                                                   |
| `gridFocusMoveForKey` / `GridKeyPress`                    | Maps a key press to a move, applying the RTL swap.                                                                                |
| `GridCell` / `sameGridCell`                               | A cell address, and address equality.                                                                                             |
| `GRID_CELL_ATTR` / `gridCellAttr`                         | The `data-grid-cell` attribute focus uses to find a cell in the DOM.                                                              |
| `contextMenuCopyTarget` / `ContextMenuCopyTarget`         | Decides what a context-menu Copy takes: the clicked cell, or the selection it landed inside.                                      |

### Copying from the context menu

The context menu names what was clicked by row key and column key. Copying
needs a grid address, and a row key is not one: where a row sits on screen
follows the sort, the filter, the page, the pinned rows and the virtual
window. `gridFocus.cellAt(rowId, columnKey)` resolves it against the very rows
and columns that grid was handed, so no adapter counts positions itself.

`contextMenuCopyTarget(gridFocus, target)` then decides what Copy takes:

```tsx
onCopy: (target) => {
  const copy = contextMenuCopyTarget(gridFocus, target);
  if (!copy.available) return;
  gridFocus.copyCells(copy.cell);
};
```

A cell with nothing selected copies that cell. A click inside a selection
keeps the selection — the rectangle is what the reader built. A click outside
one copies the cell under the cursor. A target that names no cell reports
`available: false`, and the menu greys Copy out rather than copying data
nobody pointed at. `useGridFocus` needs `getRowId` for `cellAt` to answer.

`getCellPropsAt(windowIndex, col)` and `getRowPropsAt(windowIndex)` take the
index an adapter already has — its position in the rendered rows — and convert
to the absolute address internally. That conversion lives in core precisely
because getting it wrong is invisible on screen.

## Notes

- Works in all eight adapters, verified by the same parity test in each.
- Enter and F2 open the focused cell when its column is `editable`, and do
  nothing when it is not — so arrowing to a cell and pressing Enter edits it,
  which is the whole keyboard path.
- A click that focuses a cell moves the grid's focus too; in Safari, clicking
  the row-selection checkbox does not move focus into the grid.
