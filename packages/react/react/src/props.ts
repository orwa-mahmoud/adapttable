import {
  type BulkAction,
  type CellRange,
  type CellSpanAppearance,
  type ExportCsvOptions,
  type ExtraRow,
  type FilterDef,
  type FilterTypeSpec,
  type GetCellSpan,
  type PinnedRows,
  type RowAction,
  type RowHeight,
  type RowStyle,
  type SummaryRowFn as NeutralSummaryRowFn,
  type TableOptions,
  type TableToolbarSlots,
} from "@adapttable/core";
import type { ReactNode } from "react";

import type { CommandPaletteOptions } from "./actions/useCommandPalette";
import type { ContextMenuOptions } from "./actions/useTableContextMenu";
import type { ColumnInput } from "./columnDef";
import type { BatchRowEdit } from "./editing/batchEditing";
import type { RowEditIcons } from "./editing/RowEditGate";
import type { TableFeature } from "./features/tableFeature";
import type { SidePanelEntry } from "./layout/SidePanelChrome";
import type { ReactMobileCardRenderer } from "./rows/mobileCard";
import type { RowPinState } from "./rows/rowPinning";
import type { NestedTableFor } from "./tree/nestedTable";
import type { UseSavedViewsOptions } from "./url/useSavedViews";

/**
 * Map a set of rows to per-column summary cells.
 *
 * One shape for the footer summary and for group-header aggregates. It is the
 * React face of `@adapttable/core`'s `SummaryRowFn`: these cells are rendered,
 * so their values are `ReactNode`.
 *
 * @public
 */
export type SummaryRowFn<TRow> = NeutralSummaryRowFn<TRow, ReactNode>;

/**
 * Where a host's own toolbar controls go — `@adapttable/core`'s
 * `TableToolbarSlots` holding React nodes.
 *
 * @public
 */
export type ToolbarSlots = TableToolbarSlots<ReactNode>;

/**
 * A side panel docked beside the table.
 *
 * Controlled, because the control that opens it is yours: a table settings
 * button in `toolbarSlots`, an item in your own app bar, a route. The
 * table never invents a trigger for it, and `open` is the panel's key or
 * `null` for closed.
 *
 * @public
 */
export interface SidePanelOptions {
  /** The panels, in tab order. */
  panels: readonly SidePanelEntry[];
  /** Which panel is showing, or `null` when the panel is closed. */
  open: string | null;
  /** Called with the panel to show, or `null` when it should close. */
  onOpenChange: (key: string | null) => void;
  /**
   * Which edge to dock to. `"end"` (default) is the right in a
   * left-to-right table and the left in a right-to-left one.
   */
  side?: "start" | "end";
}

/**
 * The table's edit history as a host drives it: undo and redo through the
 * table's own commit channel, whether either can run, and a reset.
 *
 * @public
 */
export interface EditHistoryHandle {
  /** Put the last gesture back. Returns how many cells were restored. */
  readonly undo: () => number;
  /** Do the last undone gesture again. Returns how many cells were rewritten. */
  readonly redo: () => number;
  /** Whether anything can be undone right now. */
  readonly canUndo: boolean;
  /** Whether anything can be redone right now. */
  readonly canRedo: boolean;
  /** Forget every gesture. */
  readonly clear: () => void;
}

/**
 * Options for `editHistory(…)`.
 *
 * @public
 */
export interface EditHistoryOptions {
  /** How many gestures to keep. Defaults to 50. */
  readonly depth?: number;
  /**
   * Told the history whenever `canUndo` or `canRedo` changes, and once on
   * mount, so a control of your own can undo, redo and enable itself.
   */
  readonly onChange?: (history: EditHistoryHandle) => void;
}

/**
 * The unsaved-edit state as a host reads and settles it.
 *
 * @public
 */
export interface DirtyEdits {
  /** How many cells hold a change nobody has confirmed. */
  readonly count: number;
  /** Clear one cell's mark — its save was confirmed. */
  readonly confirm: (rowId: string, columnKey: string) => void;
  /** Clear every mark in one row. */
  readonly confirmRow: (rowId: string) => void;
  /** Clear every mark. */
  readonly confirmAll: () => void;
}

/**
 * What a FEATURE applies, and no host passes.
 *
 * Each of these was an enabling prop on `<DataTable>` before v3. A bundler
 * follows imports and not prop values, so serving a prop meant importing the
 * implementation behind it into every table — which is the cost the feature
 * array exists to remove. They live on here because a feature's `apply()`
 * still writes them: this is the channel between `features={[grouping("team")]}`
 * and the chrome that groups, and it is internal to that hop.
 *
 * A host reaches every one of them by composing the feature instead;
 * `docs/migrate-from-v2.md` names the import for each.
 *
 * @public
 */
export interface FeatureProps<TRow> {
  /**
   * Saved views: capture the table's current URL state under a name and
   * re-apply it on demand. Setting this renders a Saved-views menu in the
   * toolbar. `adapter` / `urlKey` default to the table's own.
   */
  savedViews?: UseSavedViewsOptions;
  /** Trailing per-row actions. */
  rowActions?: RowAction<TRow>[];
  /**
   * Inline cell-edit channel. Providing this (together with per-column
   * `editable`) activates editing — omit it and the table never opens an
   * editor, even if columns declare `editable`. The table never mutates
   * rows; apply `nextValue` in your own state / mutation.
   *
   * Return a promise and the cell shows it is saving until that promise
   * settles, and shows why if it rejects — with an undo when
   * `BaseDataTableProps.onEditRollback` says how to put the row back.
   */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => unknown;
  /**
   * Show what the selected cells add up to — count, sum, average, min and max
   * — in a strip below the table. Requires `cellNavigation`.
   *
   * The count covers every selected cell; the arithmetic covers the numeric
   * ones, so a rectangle spanning a name and a budget still has a sum. A
   * single cell shows nothing: it has no total worth reading.
   */
  selectionStats?: boolean;
  /**
   * Remember edits so they can be undone — Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or
   * Ctrl+Y with `cellNavigation`, and `table.editHistory` for your own buttons.
   * Pass `{ depth }` to change how many gestures are kept (50 by default).
   *
   * An undo does not rewrite your data: it COMMITS the previous value back
   * through `onCellEdit`, so whatever you wrapped around editing runs on the
   * way back exactly as it ran on the way out. One gesture is one entry, so a
   * paste of two hundred cells undoes in a single press.
   */
  editHistory?: boolean | EditHistoryOptions;
  /**
   * Show a find bar over the table — Ctrl/Cmd+F with `cellNavigation`, or
   * `table.find.setOpen(true)` from a control of your own.
   *
   * Find is not search: it leaves every row where it is and walks the cells
   * whose text contains the query, marking them for the kit to paint. It reads
   * what a cell SHOWS, and searches the loaded rows only — a hit it cannot take
   * you to would be a lie.
   */
  findInTable?: boolean;
  /**
   * Conditional per-row class: `(row, index) => "overdue"` — appended to the
   * adapter's own row classes on desktop rows and mobile cards alike.
   */
  rowClassName?: (row: TRow, index: number) => string | undefined;
  /**
   * Conditional per-row inline style: `(row, index) => ({ background })`.
   * Applied on desktop rows and mobile cards alike. Omit and nothing is set.
   */
  rowStyle?: RowStyle<TRow>;
  /**
   * Row height in px — a constant, or `(row, index) => number`. Sets the
   * row's height and the virtualizer's `estimateSize`. `measureElement`
   * still reports what the browser laid out.
   */
  rowHeight?: RowHeight<TRow>;
  /**
   * Row expansion: render a detail panel under a row. Its presence enables
   * the leading expand chevron on desktop rows and the detail section on
   * mobile cards; multiple rows may be open, keyed by row id.
   */
  renderRowDetail?: (row: TRow) => ReactNode;
  /**
   * Row ids whose detail panel (or nested table) starts open. Uncontrolled
   * initial state — later toggles own the set. Omit and every row starts
   * closed.
   */
  defaultExpandedRowIds?: readonly string[];
  /**
   * A real table under a row instead of a blank panel. Name it after the row
   * and mount the kit's own `<DataTable>` with the defaults handed in:
   *
   * ```tsx
   * nestedTable={(row) => ({
   *   label: `Orders for ${row.name}`,
   *   table: (defaults) => (
   *     <DataTable
   *       {...defaults}
   *       data={row.orders}
   *       columns={orderColumns}
   *       rowKey={(order) => order.id}
   *     />
   *   ),
   * })}
   * ```
   *
   * It is the same component the page uses, so sorting, selection, keyboard
   * navigation and accessibility come with it. The defaults are the ones a
   * table inside a row cannot do without — no URL state to fight its parent's
   * over, no second search box, the parent's density and labels.
   *
   * Return `undefined` for a row that has no nested table; with
   * `renderRowDetail` also set, those rows fall back to it.
   */
  nestedTable?: NestedTableFor<TRow>;
  /**
   * Mark cells whose change nobody has confirmed yet — `data-dirty` on the cell
   * and on its row, so a reader can see what is still at risk. A cell clears
   * when its save resolves, when a rollback undoes it, or when the table is told
   * the value settled (`table.editing.dirty.confirm`).
   *
   * Off by default: a mark is a claim about what the server has agreed to, and a
   * table whose host never says would be guessing.
   */
  dirtyIndicators?: boolean;
  /**
   * Told the unsaved-edit state whenever it changes, and once on mount —
   * `editing(commit, { onDirtyChange })`. Passing it tracks unsaved edits on
   * its own; `dirtyIndicators()` adds the cell and row marks for the same set.
   */
  onDirtyChange?: (dirty: DirtyEdits) => void;
  /**
   * Edit a whole row at once instead of a cell at a time: every field opens
   * together, holds its draft, and reaches the host as ONE patch when the reader
   * saves. Requires `BaseDataTableProps.onRowEdit`.
   *
   * The right unit for a row whose fields constrain each other — a start and an
   * end date cannot be edited one at a time without passing through a state that
   * is invalid on the way.
   */
  rowEditing?: boolean;
  /**
   * Take everything a row edit changed, as one patch of parsed values keyed by
   * column. The table never writes to a row.
   *
   * Return a promise and the row's controls show it is saving, exactly as a cell
   * does.
   */
  onRowEdit?: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown;
  /**
   * Glyphs for the row-mode controls. Omit for each kit's own pencil, check
   * and cross, named by `labels.editRow`, `labels.saveRow` and
   * `labels.cancel`. See {@link RowEditIcons}.
   */
  rowEditIcons?: RowEditIcons;
  /**
   * Change many rows and save them together: every editable cell is a field,
   * nothing is sent until the reader saves, and one Cancel puts it all back.
   * The shape of a review pass — walk a list correcting values, write once.
   * Requires `BaseDataTableProps.onBatchEdit`.
   */
  batchEditing?: boolean;
  /**
   * Take every pending row at once, as a list of `{ row, rowId, patch }`. Called
   * once per save, which is what lets a host make the whole batch one request.
   */
  onBatchEdit?: (edits: readonly BatchRowEdit<TRow>[]) => unknown;
  /**
   * Add a row — an Add control appears in the toolbar as soon as this is set.
   * The host makes the row and stores it; it reaches the table through the
   * source like every other row, so it is editable, filterable and counted
   * from the moment it lands.
   */
  onAddRow?: () => unknown;
  /**
   * Copy a row — a Duplicate action appears on every row. What a copy means
   * (which fields carry over, which reset, what id it gets) is the host's.
   */
  onDuplicateRow?: (row: TRow) => unknown;
  /** Remove a row. A Delete row action appears as soon as this is set. */
  onDeleteRow?: (row: TRow) => unknown;
  /**
   * Controlled row pins. `{ top, bottom }` lists of row ids that render
   * outside the virtual window — sticky above and below the scroll box —
   * so they are not drawn twice. Omit for the internal (uncontrolled)
   * lists. Grouping or a tree refuses this with a `devWarn`.
   *
   * Mobile cards get the same pin actions but no sticky chrome: a card
   * list is not a grid.
   */
  pinnedRowIds?: RowPinState;
  /**
   * Pin-list change channel. Uncontrolled: an observer. Controlled: apply
   * the next lists to accept.
   */
  onPinnedRowIdsChange?: (next: RowPinState) => void;
  /**
   * Row pinning is composed. `rowPinning()` sets it, so a bare call pins rows
   * with the table holding the lists.
   */
  rowPinningArmed?: boolean;
  /**
   * Per-cell row/column span. Return `{ colSpan, rowSpan }` for the origin;
   * covered cells are omitted from the row's cell list. Column-level
   * `colSpan` / `rowSpan` on the column def are the same
   * thing when every row of a column shares a rule. Omit both and every
   * kit still maps one cell per column.
   *
   * Mobile cards ignore geometry — a card is a list of fields. Spans are
   * derived from data, so nothing is written to the URL.
   */
  getCellSpan?: GetCellSpan<TRow>;
  /**
   * How a spanned cell is painted. Omit / `"merged"` is the spreadsheet look
   * (centered content, one fill). `"plain"` keeps today's 1×1 chrome so a
   * host can style a calendar-style bar on `data-cell-span`.
   */
  cellSpanAppearance?: CellSpanAppearance;
  /**
   * Host-injected separator and full-width rows, spliced into the body
   * by `beforeRowId`. Omit the list and nothing is inserted. Extras are
   * content, not table state — nothing is written to the URL. Mobile
   * cards keep the same slots.
   */
  extraRows?: readonly ExtraRow[];
  /**
   * Independent summary objects stuck above and below the scroll body.
   * They are not data rows: sorting, filtering, grouping, pagination and
   * selection never see them. Compose `pinnedSummaryRows({ top, bottom })`.
   */
  pinnedRows?: PinnedRows<TRow>;
  /**
   * Delete without a confirmation dialog. Off by default — a delete is
   * destructive and the table cannot undo it.
   */
  confirmDeleteRow?: boolean;
  /**
   * Hierarchical rows: a row's children, for nested data.
   *
   * A tree is declared by the DATA — a folder contains files, a task has
   * subtasks — which is why it is not grouping: grouping answers a question
   * the reader asked and re-answers it when they change the question.
   *
   * Its presence arms the tree; omit it (and `getParentId`) and the table
   * renders a flat list exactly as before.
   */
  getChildren?: (row: TRow) => readonly TRow[] | undefined;
  /** Hierarchical rows the other way round: a flat table with a parent column. */
  getParentId?: (row: TRow) => string | undefined;
  /**
   * Which column carries the chevron and the indent. Defaults to the first
   * rendered column, which is where a reader looks for a tree.
   */
  treeColumn?: string;
  /**
   * Fetch a node's children when the reader opens it — a tree of any size
   * arrives one branch at a time. Pair it with `hasChildren` so a node the
   * browser has not fetched still shows a chevron. Resolve once the children
   * are in the data the table reads; the table re-walks the hierarchy itself
   * and needs nothing back. Its node carries a loading flag until then, and a
   * rejection leaves the node closed and clickable so a retry is the same
   * gesture as the first attempt.
   */
  onLoadChildren?: (row: TRow) => void | Promise<void>;
  /** Column key rows are grouped on. */
  groupBy?: string | readonly string[] | null;
  /**
   * Opt into multi-column sorting: shift-click (or shift-Enter) on a header
   * adds the column to the sort chain (asc → desc → removed); a plain click
   * still single-sorts. Sorted headers expose `data-sort-index` for badges.
   */
  multiSort?: boolean;
  /** Render the built-in "Columns" menu (show/hide, pin, reorder). */
  enableColumnMenu?: boolean;
  /** Enable drag/keyboard column resize handles. Defaults to false (opt-in). */
  resizableColumns?: boolean;
  /**
   * Column-group headers gain a collapse toggle. Each group decides what
   * remains: an arrow stub, `collapsedKey`, or `collapsedRender`. State
   * lives on `columnLayout.collapsedGroups` and the URL (`colGroupCollapse`).
   * Omit and group headers stay static.
   */
  collapsibleColumnGroups?: boolean;
  /** Virtualize long infinite lists. Defaults to false. */
  virtualize?: boolean;
  /**
   * Window the COLUMNS as well as the rows, for tables that are wide rather
   * than long: a hundred columns render as the two dozen a reader can see,
   * plus a margin, with the rest held open by two spacer cells.
   *
   * Needs a horizontal scroll container, so it applies with `maxHeight` or
   * pinned columns. Pinned columns are never windowed out — they are on screen
   * by definition — and the spacers are logical, so a wide RTL table scrolls
   * the right way.
   *
   * Not available in the Ant Design adapter, which renders through antd's own
   * `<Table>`: that component owns its column rendering, and windowing it from
   * outside would fight it rather than help.
   */
  virtualizeColumns?: boolean;
  /**
   * Make the columns share the container's width instead of overflowing it.
   *
   * Columns with a `flex` take that share of the space; columns with a `width`
   * keep it; everything else divides what is left equally. `minWidth` and
   * `maxWidth` are respected either way, so a column never shrinks below what
   * it needs to be read.
   */
  fitColumns?: boolean;
  /**
   * The table's filters. Pass a declarative array and the adapter builds the
   * form with kit-native widgets (each definition also drives URL parsing,
   * chips and — on frontend data — the row predicate); pass JSX to draw the
   * form yourself. Column-level `filter` shorthands merge in; a `filters`
   * entry with the same key wins.
   */
  filters?: readonly FilterDef<TRow>[] | ReactNode;
  /**
   * Extra or replacement filter types merged onto the built-in registry.
   * A spec whose `type` matches a built-in replaces it. Omit and only
   * the built-ins are available.
   */
  filterTypes?: readonly FilterTypeSpec[];
  /**
   * Alias for `filtersMode="header"`: a per-column filter icon on the
   * header, bound to the same defs and extra bag as the panel. Desktop
   * only. Hides the toolbar Filters button unless `source.setFilterTree`
   * is set (the AND/OR tree has no column of its own). Omit the prop and
   * nothing extra renders.
   */
  headerFilters?: boolean;
  /** Bulk actions — enabling these turns on row selection. */
  bulkActions?: BulkAction[];
  /**
   * Opt-in export toolbar button. Pass `true` for defaults (current page,
   * `export.` plus the writer's extension) or an options object for
   * filename, scope and writer.
   * Omit or `false` to hide the button.
   */
  exportCsv?: boolean | ExportCsvOptions<TRow>;
  /**
   * Opt into keyboard cell navigation.
   *
   * The table becomes ONE tab stop whose interior is reachable by arrow keys,
   * Home/End, Ctrl+Home/End and PageUp/PageDown, with `role="grid"`, absolute
   * `aria-rowindex` / `aria-colindex`, and a live region naming the focused
   * cell. Enter or F2 opens the editor when `onCellEdit` is set.
   *
   * Off by default, and off means absent: no role change, no `tabIndex`, no key
   * handler, no live region. Applies to the desktop table layout — mobile cards
   * are a list, not a grid, and keep their list semantics.
   */
  cellNavigation?: boolean;
  /**
   * Told the selected cell rectangle whenever it changes, and once on mount —
   * `null` when nothing beyond the focused cell is selected. Set through
   * `cellNavigation({ onRangeChange })`.
   */
  onCellRangeChange?: (range: CellRange | null) => void;
  /**
   * Offer a checkbox in every column header that selects that column.
   * Defaults to false, and needs `cellNavigation` to do anything.
   *
   * Ctrl/Cmd+click on a header already selects a column, and that gesture is
   * unchanged. It is also unreachable on a touch device — there is no Ctrl key
   * to hold — and undiscoverable to anyone who has not been told about it. This
   * is the same selection behind a control a finger can hit and a screen reader
   * can name. On a hovering pointer it holds its space and fades in on hover or
   * focus, so a wide header row is not a row of checkboxes; where there is no
   * hover it is always visible.
   */
  columnSelectionCheckbox?: boolean;
  /**
   * Feature-applied marker for the composed density chooser.
   *
   * The adapter control comes from the feature's toolbar slot; shared chrome
   * reads the separately resolved `density` value.
   */
  densityChooser?: boolean;
  /**
   * A fullscreen toggle in the toolbar. Defaults to off.
   *
   * Fullscreen hides everything outside the table, which is what makes it
   * useful and also what breaks overlays: a menu portalled to
   * `document.body` is inside the part being hidden. The table's own
   * overlays are re-pointed at the fullscreen element while it is on.
   *
   * The button hides itself where the browser will not allow fullscreen at
   * all — an embedded webview, a sandboxed frame — because a control that
   * cannot work is worse than no control.
   */
  fullscreen?: boolean;
  /**
   * Open the print dialog on the current view.
   *
   * What gets printed is the host's: `printTable` opens a browser dialog and
   * `downloadExportFile` cannot, so the table asks and the host decides.
   * Wire this and it becomes a command in the palette and an entry anywhere
   * else commands are listed. Add `printButton` for a toolbar control
   * as well — opt-in chrome either way, never a permanent button.
   *
   * ```tsx
   * import { printTable } from "@adapttable/core/pdf";
   *
   * <DataTable onPrint={() => printTable({ rows, columns })} … />
   * ```
   */
  onPrint?: () => void;
  /**
   * A command palette, opened with Cmd/Ctrl+K. Defaults to off.
   *
   * It lists the table's own actions — print, export, clear filters, each
   * appearing only when wired — and anything you add. Its entries are the
   * same objects the context menus take, so an action is written once and
   * offered in both places rather than drifting between them.
   *
   * ```tsx
   * <DataTable
   *   commandPalette={{
   *     commands: [{ key: "audit", label: "Open audit log", onSelect: open }],
   *     shortcuts: [{ chord: "ctrl+shift+p", command: "command-palette" }],
   *   }}
   *   …
   * />
   * ```
   */
  commandPalette?: boolean | CommandPaletteOptions;
  /**
   * Right-click menus for headers, rows and cells. Defaults to off.
   *
   * `true` takes the built-in entries — sort, filter, pin and hide on a
   * header; copy and cut on a cell — each appearing only when the handler
   * behind it is wired and the column allows it. Pass `{ items }` to append
   * your own, which land behind a divider so a custom action is never
   * mistaken for a built-in one.
   *
   * Every route in works: right-click, Shift+F10 and the menu key for the
   * keyboard, and a long press for touch. Escape closes and puts focus back
   * where it came from.
   */
  contextMenu?: boolean | ContextMenuOptions<TRow>;
  /**
   * Dock a settings panel beside the table.
   *
   * A popover is right for a control you touch once. It is wrong for
   * setting a table up — choosing columns, building a filter — because
   * that is iterative, and a popover closes when you look away with the
   * rows behind it. Omit this and nothing renders and nothing is bundled.
   *
   * ```tsx
   * const [panel, setPanel] = useState<string | null>(null);
   *
   * <DataTable
   *   toolbarSlots={{
   *     end: <button onClick={() => setPanel("filters")}>Settings</button>,
   *   }}
   *   sidePanel={{
   *     panels: [{ key: "filters", label: "Filters", content: <MyFilters /> }],
   *     open: panel,
   *     onOpenChange: setPanel,
   *   }}
   *   …
   * />
   * ```
   */
  sidePanel?: SidePanelOptions;
  /**
   * Show a status bar under the table. Defaults to false.
   *
   * It reads how many rows are on screen, how many are selected, and what
   * a multi-cell selection adds up to — the line a spreadsheet user
   * glances at without thinking. The sums appear only with
   * `selectionStats` armed; the counts are always there.
   */
  statusBar?: boolean;
  /**
   * Show Undo and Redo buttons in the toolbar. Defaults to false.
   *
   * The keyboard shortcuts and `table.editHistory` are the always-on path
   * — this is the visible one, for an app whose users will not find
   * Ctrl+Z. The buttons render only when `editHistory` is armed, and
   * disable rather than disappear when there is nothing to undo or redo,
   * so the toolbar does not change width as the user works.
   */
  undoRedoButtons?: boolean;
  /**
   * Show a Print button in the toolbar. Defaults to false.
   *
   * The palette command is the always-on path once `onPrint` is wired
   * — this is the visible one, for an app whose users will not reach for
   * Cmd/Ctrl+K. It renders only when both are set: a button that opens
   * nothing would be worse than no button, so the option alone draws
   * nothing and the handler alone stays a command.
   */
  printButton?: boolean;
}

/**
 * The props the table works with once `features` have applied.
 *
 * The public surface a host writes is {@link BaseDataTableProps}; everything
 * past `useTableFeatures` also carries what the composed features wrote, and
 * this is that shape. Internal seams take it — the chrome, the slots, the
 * shell — so a feature and the code it arms agree on one type rather than on
 * a cast.
 *
 * @public
 */
export type ComposedTableProps<TRow> = BaseDataTableProps<TRow> &
  FeatureProps<TRow>;

/**
 * The UI-agnostic prop surface shared by every AdaptTable adapter's
 * `<DataTable>`. Adapters extend this with kit-specific extras (slots,
 * classNames, animation, …) so the common contract lives in one place.
 *
 * Every option that is data or a callback comes from `@adapttable/core`'s
 * `TableOptions`; this adds what is React's own — column definitions with
 * renderers, the feature array and a custom mobile card.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface BaseDataTableProps<TRow> extends TableOptions<
  TRow,
  ReactNode
> {
  /** Column definitions. A parent with `children` is a column group. */
  columns: ColumnInput<TRow>[];
  /**
   * Compose opt-in features from `@adapttable/<kit>/<feature>` subpath
   * imports. The import is the switch: a table downloads a feature when it
   * names one here, and nothing else brings it.
   *
   * See [feature composition](https://adapttable.orwamahmoud.com/react/features/).
   *
   * Built-in factories and host plugins are the same {@link TableFeature}
   * type in this one array.
   */
  // `NoInfer` so a factory that cannot work out the row type — `grouping("team")`,
  // `virtualize()` — does not offer `unknown` as a candidate and pin the whole
  // table to it, rejecting its own `columns` and `rowKey`.
  features?: readonly TableFeature<NoInfer<TRow>>[];
  /**
   * Replace a mobile card's body with your own layout.
   *
   * The card's shell stays: list-item semantics, the selection checkbox, the
   * expand and tree toggles, reorder controls, row actions and the detail
   * panel all render around what you return, so a custom card cannot drop the
   * parts that make the list usable. The `card` argument hands you the fields
   * the built-in would have laid out — column, label and rendered value,
   * editors included — so this is a layout decision, not a re-implementation.
   *
   * Omit it and the built-in card renders, byte for byte.
   */
  renderCard?: ReactMobileCardRenderer<TRow>;
}
