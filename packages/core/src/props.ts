import type { ReactNode } from "react";

import type { ConfirmHandler } from "./actions/confirm";
import type { CommandPaletteOptions } from "./actions/useCommandPalette";
import type { ContextMenuOptions } from "./actions/useTableContextMenu";
import type { ColumnInput } from "./columns/columnTree";
import type { ColumnLayoutState } from "./columns/useColumnLayout";
import type { BatchRowEdit } from "./editing/batchEditing";
import type {
  EditConflictHandler,
  EditConflictPolicy,
} from "./editing/editConflict";
import type { EditEventHandler } from "./editing/editingEvents";
import type { RowValidator } from "./editing/validation";
import type { ExportCsvOptions } from "./export/tableCsv";
import type { TableFeature } from "./features/tableFeature";
import type { FilterDef } from "./filters/filterDefs";
import type { FilterTypeSpec } from "./filters/filterRegistry";
import type {
  ActiveFilterChip,
  ChipLabelResolver,
} from "./filters/useActiveFilterChips";
import type { CellEdit } from "./focus/cellEdits";
import type { CellRange } from "./focus/cellRange";
import type { GroupNode, GroupSort } from "./grouping/groupRows";
import type { SidePanelEntry } from "./layout/SidePanelChrome";
import type { CellSpanAppearance, GetCellSpan } from "./rows/cellSpan";
import type { ExtraRow } from "./rows/extraRows";
import type { MobileCardRenderer } from "./rows/mobileCard";
import type { RowActionsLayout, RowActionsRenderer } from "./rows/rowActions";
import type { RowPinState } from "./rows/rowPinning";
import type { RowHeight, RowStyle } from "./rows/rowStyle";
import type { TableSource } from "./source/TableSource";
import type { NestedTableFor } from "./tree/nestedTable";
import type {
  BulkAction,
  Direction,
  ExtraFilters,
  PaginationMode,
  RowAction,
  SortByOption,
  TableLabels,
  TableQueryParams,
} from "./types";
import type { UseSavedViewsOptions } from "./url/useSavedViews";

/**
 * Where a host's own toolbar controls go.
 *
 * The toolbar reads Search · custom · Filters · Saved views · Columns ·
 * Undo/Redo · Export · Add · Rows per page, and that order is the same in
 * every kit. These name the two places outside it, so a control can be
 * put before everything or after everything without an adapter having to
 * know what the control is.
 *
 * @public
 */
export interface ToolbarSlots {
  /** Ahead of the search input. */
  start?: ReactNode;
  /** After every built-in control, before the rows-per-page select. */
  end?: ReactNode;
}

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
 * The UI-agnostic prop surface shared by every AdaptTable adapter's
 * `<DataTable>`. Adapters extend this with kit-specific extras (slots,
 * classNames, animation, …) so the common contract lives in one place.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface BaseDataTableProps<TRow> {
  /** Data + state contract from `useFrontendData` / `useQuerySource`. */
  source: TableSource<TRow>;
  /** Column definitions. A parent with `children` is a column group. */
  columns: ColumnInput<TRow>[];
  /** Stable React key extractor for a row. */
  rowKey: (row: TRow) => string;
  /**
   * Compose opt-in features from `@adapttable/<kit>/<feature>` subpath
   * imports. Identical runtime to the enabling props — those props are
   * deprecated and remain until v3.
   *
   * There is no bundle saving yet: while the props still work, `DataTable`
   * keeps its internal imports. The drop lands at v3. See
   * [feature composition](https://orwa-mahmoud.github.io/adapttable/features/).
   *
   * Built-in factories and host plugins are the same {@link TableFeature}
   * type in this one array.
   */
  features?: readonly TableFeature<TRow>[];
  /**
   * Saved views: capture the table's current URL state under a name and
   * re-apply it on demand. Setting this renders a Saved-views menu in the
   * toolbar. `adapter` / `urlKey` default to the table's own.
   *
   * Prefer `features={[savedViews(options)]}` from
   * `@adapttable/<kit>/saved-views`. This prop still works until v3.
   */
  savedViews?: UseSavedViewsOptions;

  /* ── Display ─────────────────────────────────────────────────────── */
  /** Trailing per-row actions. */
  rowActions?: RowAction<TRow>[];
  /**
   * How the trailing actions column renders. Omit or `"buttons"` for the
   * horizontal strip. `"menu"` collapses visible actions into a 3-dot menu
   * using each kit's own Menu. `BaseDataTableProps.renderRowActions`
   * wins over this.
   */
  rowActionsLayout?: RowActionsLayout;
  /**
   * Replace the trailing actions cell (desktop and mobile cards). Receives
   * the resolved action list (host + built-in duplicate / delete / pin).
   * When set, `rowActionsLayout` is ignored. The column still only appears
   * when there are row actions (or row-mode editing).
   */
  renderRowActions?: RowActionsRenderer<TRow>;
  /** Accessible label for the table. */
  tableLabel?: string;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Options for a mobile sort-by select. */
  sortByOptions?: SortByOption[];
  /** Pre-translated label overrides. */
  labels?: TableLabels;
  /** Text direction. Defaults to `"ltr"`. */
  dir?: Direction;
  /**
   * Active locale tag (e.g. `"ar"`, `"ar-EG"`). Drives per-column `i18n`
   * data-path resolution; labels stay a separate concern (`labels`).
   */
  locale?: string;
  /**
   * Row density — independent of column pinning. `"comfortable"` (default) is
   * the roomy layout; `"compact"` tightens row height/padding. Each adapter
   * maps it to its kit's table size.
   */
  density?: "comfortable" | "compact";
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
  renderCard?: MobileCardRenderer<TRow>;
  /** Force the mobile layout (otherwise resolved from the viewport). */
  forceMobile?: boolean;
  /**
   * The width, in pixels, at or below which the card layout takes over.
   * Defaults to 768 — a phone in portrait.
   *
   * Raise it when the table lives in a sidebar or a split pane, where the
   * viewport says "desktop" while the table has a phone's width to work
   * with. Lower it when the table is the whole page and its columns are
   * narrow enough to survive.
   */
  mobileBreakpoint?: number;
  /**
   * Initial state applied while the URL is silent about a key — e.g.
   * `defaults={{ limit: 10, sortBy: "name" }}`. The user's own changes
   * (and explicit URL params) always win.
   */
  defaults?: Partial<TableQueryParams> & { extra?: ExtraFilters };
  /**
   * Debounce for committing the search input to the source, in
   * milliseconds. Defaults to 300.
   */
  searchDebounceMs?: number;
  /**
   * Pagination mode: `"paged"`, `"infinite"`, or `"auto"` (the default —
   * mobile resolves to infinite, desktop to paged). `virtualize` applies
   * in infinite mode; on a paged desktop table it is inert.
   */
  paginationMode?: PaginationMode;
  /**
   * How many leading desktop-visible columns anchor the mobile identity
   * block. Never overrides an explicit `hideOnMobile: true` — the
   * author's hide always wins.
   */
  mobileIdentityColumns?: number;
  /** Hover-prefetch callback fired on desktop row mouse-enter. */
  prefetch?: (row: TRow) => void;
  /**
   * Row activation — fires on row click and on Enter when the row has focus.
   * Interactive children (action buttons, the selection checkbox, links)
   * keep their own behaviour and never trigger it.
   */
  onRowClick?: (row: TRow) => void;
  /** Called whenever the materialized source rows change. */
  onRowsChange?: (rows: readonly TRow[]) => void;
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
   * Cut — Ctrl/Cmd+X, after the clipboard has accepted the copy. Requires
   * `cellNavigation`.
   *
   * The table clears nothing itself: what a cut removes is your decision, and
   * emptying cells before the clipboard took them would lose the data outright.
   */
  onCellCut?: (range: CellRange) => void;
  /**
   * Paste — Ctrl/Cmd+V, with the clipboard already parsed into ordinary cell
   * edits. Requires `cellNavigation`.
   *
   * Omit it and every edit goes through `onCellEdit`, so a table that can be
   * edited can be pasted into with nothing extra wired. Provide it to take the
   * batch whole — one server round trip, one undo entry.
   *
   * Cells landing outside the loaded rows or the rendered columns are dropped
   * rather than invented, and a column that is not `editable` is skipped.
   */
  onCellPaste?: (edits: CellEdit<TRow>[]) => void;
  /**
   * Fill — the handle dragged from the selection's corner, or Ctrl/Cmd+D.
   * Requires `cellNavigation`.
   *
   * Same contract as `onCellPaste`: omit it and every edit goes through
   * `onCellEdit`, so the handle appears as soon as the table can be edited.
   * Provide it to take the batch whole.
   */
  onCellFill?: (edits: CellEdit<TRow>[]) => void;
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
  editHistory?: boolean | { depth?: number };
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
   * Mark cells a patch just changed — `data-flash` on the cell and on the
   * matching card value. Pair with `useChangedCellFlash` from
   * `@adapttable/core/stream`. Omit and nothing is marked.
   */
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
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
   * Gate a commit on a rule no single cell can answer — an end date before its
   * start, a total that must match its parts. Receives the row the edit WOULD
   * produce, not the stored one; return a message for a row-level problem, a map
   * of column key → message to mark individual cells, or nothing to allow it.
   * May be async.
   */
  validateRow?: RowValidator<TRow>;
  /**
   * Put a row back the way it was after a rejected save.
   *
   * A table that applies an edit optimistically has already shown the new
   * value, so a rejection has to restore the old one — and only the host can
   * write to its own rows. Without this the cell is marked failed and the value
   * stays put, which is right for a table that refetches instead.
   */
  onEditRollback?: (previous: TRow, columnKey: string) => void;
  /** Turn a rejected save into the sentence its cell shows. */
  formatEditError?: (error: unknown) => string;
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
   * Observe an editor opening. Fires for cell, row and batch units. The
   * handler cannot change the outcome — throwing is swallowed.
   */
  onEditStart?: EditEventHandler<TRow>;
  /**
   * Observe a cancel (Escape, Cancel, throwing a batch away). Not fired when
   * a successful commit merely closes the editor.
   */
  onEditCancel?: EditEventHandler<TRow>;
  /**
   * Observe a value reaching the host. Fires after parse and validation, at
   * the same moment as `onCellEdit` / `onRowEdit` / `onBatchEdit`.
   */
  onEditCommit?: EditEventHandler<TRow>;
  /**
   * Observe a validator refusing a value. The editor stays open with the
   * message; this is how analytics hears about it.
   */
  onValidationFail?: EditEventHandler<TRow>;
  /**
   * Observe a save promise rejecting. The cell is already marked failed;
   * this is the side-effect channel.
   */
  onEditError?: EditEventHandler<TRow>;
  /**
   * A row changed underneath an open editor. Return `"keep"` or `"take"` to
   * resolve it; return nothing and `BaseDataTableProps.editConflictPolicy`
   * decides. The default policy is `"ask"`.
   */
  onEditConflict?: EditConflictHandler<TRow>;
  /**
   * What to do when a live update disagrees with an open editor and the host
   * did not choose. `"ask"` (default) surfaces Keep mine / Take theirs.
   */
  editConflictPolicy?: EditConflictPolicy;
  /**
   * Host version of a row. When set, any version change under an open editor
   * is a conflict, not only a change to the edited column.
   */
  rowVersion?: (row: TRow) => string | number;
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
   * Reorder a row — a drag handle appears in a reserved leading column as
   * soon as this is set. `from` / `to` are dataset-relative (page offset
   * included), and `row` is the one that moved. The table never mutates the
   * array; apply the move with `applyRowReorder` or your own write.
   *
   * Keyboard: Space lifts, arrows move, Space drops, Escape cancels.
   * Grouping or a tree refuses this with a `devWarn` — nested order is not
   * a flat splice. Mobile cards get up/down buttons rather than a grip.
   */
  onRowReorder?: (from: number, to: number, row: TRow) => void;
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
   * the next lists to accept. Setting this (or `BaseDataTableProps.pinnedRowIds`)
   * is what arms the feature — omit both and nothing renders.
   */
  onPinnedRowIdsChange?: (next: RowPinState) => void;
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
   * Delete without a confirmation dialog. Off by default — a delete is
   * destructive and the table cannot undo it.
   */
  confirmDeleteRow?: boolean;
  /**
   * How an edit is applied to a row for `BaseDataTableProps.validateRow`
   * to judge. Defaults to a shallow spread keyed by the column key, which is
   * right when a column key IS the field; pass this when a column reads a
   * nested path.
   */
  applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
  /**
   * Footer summary: map the CURRENT page's rows to per-column summary cells
   * (`{ budget: <b>{total}</b> }`). Rendered as a table footer row aligned
   * under its columns; keys absent from the result render empty cells.
   */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
  /**
   * Free slot under the table (above the pager). Not the column-aligned
   * summary row — that is `BaseDataTableProps.summaryRow`.
   */
  tableFooter?: ReactNode;
  /**
   * Row grouping by column key — one key, or an ordered list for nested
   * groups: `groupBy={["team", "status"]}` puts each status inside its team,
   * and every header carries the count and aggregates of its whole subtree.
   *
   * Its presence (or `source.groupBy`) arms grouping chrome — omit it and the
   * table never inserts group header rows (package DNA: opt-in). Frontend tier
   * only; server-paginated sources get a devWarn and grouping is ignored.
   */
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
   * Whether a row has children that have not been fetched yet — a server tree
   * knows there is more before the browser does.
   */
  hasChildren?: (row: TRow) => boolean;
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
  /** Controlled tree expansion: the ids currently open. */
  expandedIds?: readonly string[];
  /** Fired after the table opens or closes a node. */
  onExpandedIdsChange?: (ids: string[]) => void;
  /** Column key rows are grouped on. */
  groupBy?: string | readonly string[] | null;
  /**
   * Notification fired AFTER the grouping change is applied — the table
   * always performs the change itself. Take full control (e.g. a fully
   * controlled `groupBy`) through `source.setGroupBy` instead.
   *
   * Receives the keys as a list, empty when grouping was cleared.
   */
  onGroupByChange?: (groupBy: readonly string[]) => void;
  /**
   * Per-group aggregate cells — **same signature as {@link summaryRow}**.
   * Called with each group's leaf rows. Omit for headers without subtotals.
   */
  /**
   * Close every group with a footer row carrying its aggregates — the totals
   * read at the bottom of the group as well as the top, which is where a long
   * group's reader is by the time they need them.
   *
   * Needs `groupAggregates`: a footer with nothing to total is a blank row.
   * Nested groups each get their own, innermost first. The table's own
   * grand total is `summaryRow`, which already totals the whole set.
   */
  groupFooters?: boolean;
  /**
   * Order groups within their parent: `"label"`, `"label-desc"`, `"count"`,
   * `"count-desc"`, or your own comparator over `{ value, label, level,
   * groupBy, leafRows }`.
   *
   * To sort groups by an aggregate, compare the same rows the aggregate reads
   * — `(a, b) => total(b.leafRows) - total(a.leafRows)` sorts by total
   * descending. Without this, groups keep the order the source's own sort
   * produced.
   */
  groupSort?: GroupSort<TRow>;
  /**
   * Show at most this many top-level groups at a time, with a row offering the
   * rest. A table grouped by customer can have ten thousand groups, and
   * rendering all of them to fill one screen is the mistake virtualization
   * exists to avoid.
   */
  groupPageSize?: number;
  /**
   * Show at most this many rows inside each group, with a "load more in this
   * group" row beneath them.
   */
  groupRowPageSize?: number;
  /**
   * Called when a reader asks for more rows inside a group — the hook a server
   * tier needs, since the rest of that group is not in the browser yet. The
   * table reveals what it already holds either way.
   */
  onGroupLoadMore?: (groupKey: string) => void;
  /**
   * Keep only the groups this answers true for, at every level — the group
   * equivalent of a filter, working on aggregates rather than cells:
   * `(g) => total(g.leafRows) > 10_000`.
   *
   * A dropped group takes its leaves with it. Row filters still run first, so
   * this decides which of the SURVIVING rows' groups are worth showing.
   */
  groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Aggregates shown on each group header. */
  groupAggregates?: (
    rows: readonly TRow[]
  ) => Partial<Record<string, ReactNode>>;
  /**
   * Controlled collapsed group keys (ephemeral — not URL-synced).
   * Uncontrolled: internal `useGroupCollapse`.
   */
  collapsedGroupIds?: readonly string[];
  /** Called with the collapsed groups after a toggle. */
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** Disable the built-in search box. */
  /**
   * Render the search input. Positive polarity — `false` hides it.
   * @defaultValue true
   */
  searchable?: boolean;
  /**
   * Opt into multi-column sorting: shift-click (or shift-Enter) on a header
   * adds the column to the sort chain (asc → desc → removed); a plain click
   * still single-sorts. Sorted headers expose `data-sort-index` for badges.
   */
  multiSort?: boolean;

  /* ── Column management ───────────────────────────────────────────── */
  /** Render the built-in "Columns" menu (show/hide, pin, reorder). */
  enableColumnMenu?: boolean;
  /** Enable drag/keyboard column resize handles. Defaults to false (opt-in). */
  resizableColumns?: boolean;
  /** Controlled column layout (hidden/order/pinned/widths). */
  columnLayout?: ColumnLayoutState;
  /** Change handler for the controlled column layout. */
  onColumnLayoutChange?: (next: ColumnLayoutState) => void;
  /** Initial column layout for the uncontrolled mode. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /**
   * Column-group headers gain a collapse toggle. Each group decides what
   * remains: an arrow stub, `collapsedKey`, or `collapsedRender`. State
   * lives on `columnLayout.collapsedGroups` and the URL (`colGroupCollapse`).
   * Omit and group headers stay static.
   */
  collapsibleColumnGroups?: boolean;
  /**
   * Fixed-height scroll box (px). Enables sideways scrolling + column pinning;
   * the header and pinned columns pin within this box. Omit for page scroll.
   */
  maxHeight?: number;

  /* ── Virtualization ──────────────────────────────────────────────── */
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
  /** Desktop row-size estimate in px. */
  estimateRowSize?: number;
  /** Mobile card-size estimate in px. */
  estimateCardSize?: number;
  /** Extra rows/cards rendered before and after the virtual window. */
  virtualOverscan?: number;
  /**
   * Override for window-mode virtualization's scroll offset.
   *
   * When omitted, the list's document offset is measured so a table below
   * page chrome does not open with a blank gap. Pass a value only when you
   * already know that offset (tests, or a table whose position is fixed).
   */
  virtualScrollMargin?: number;

  /* ── Filters ─────────────────────────────────────────────────────── */
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
   *
   * Prefer `features={[filterTypes(specs)]}` or `host.registerFilterType`
   * in `TableFeature.setup`. This prop still works until v3.
   */
  filterTypes?: readonly FilterTypeSpec[];
  /**
   * Resolved filter definitions, used to label AND/OR tree chips. The
   * shell sets this from the declarative `filters` array; hosts that
   * call `useTableChrome` directly can pass the same defs the builder
   * receives.
   */
  filterDefs?: readonly FilterDef<TRow>[];
  /**
   * How the filter container opens. One mode at a time — never stacked.
   * `"popover"` (default) anchors a light card under the Filters button
   * (no backdrop); `"drawer"` slides in a side panel with a real backdrop;
   * `"header"` is the compact per-column row and hides the toolbar button.
   * `headerFilters` is an alias for `"header"`.
   */
  filtersMode?: "popover" | "drawer" | "header";
  /** Per-filter-key chip label resolvers. */
  filterLabels?: Readonly<Record<string, ChipLabelResolver>>;
  /** Extra chips driven by non-URL state, merged with the derived chips. */
  extraChips?: readonly ActiveFilterChip[];
  /** Override the active-filter count (defaults to the chip count). */
  activeFilterCount?: number;
  /**
   * Notification fired AFTER the filters are cleared (drawer, chip strip,
   * no-results CTA) — the table always performs the clear itself. Take
   * full control through `source.clearExtras` instead.
   */
  onClearFilters?: () => void;
  /**
   * Alias for `filtersMode="header"`: a per-column filter icon on the
   * header, bound to the same defs and extra bag as the panel. Desktop
   * only. Hides the toolbar Filters button unless `source.setFilterTree`
   * is set (the AND/OR tree has no column of its own). Omit the prop and
   * nothing extra renders.
   */
  headerFilters?: boolean;
  /**
   * Close a header-filter popover after a finished single-control write
   * (a select/boolean value, or a valueless operator such as "Is empty").
   * Off by default — picking an operator on a field that still has a value
   * input must not dismiss the overlay. Outside click and Escape always close.
   */
  closeHeaderFilterOnSelect?: boolean;
  /**
   * Mount the per-field Filters form. Default on. Pass `false` to keep only
   * the AND/OR tree in that chrome — the field list is gone, not hidden.
   */
  filterFields?: boolean;

  /* ── Bulk actions ────────────────────────────────────────────────── */
  /** Bulk actions — enabling these turns on row selection. */
  bulkActions?: BulkAction[];
  /** Selection id extractor; defaults to `rowKey`. */
  selectionGetId?: (row: TRow) => string;
  /**
   * Controlled selection. When provided, the table reads the selection from
   * this value and reports every change request through `onSelectionChange`
   * — the same controlled/uncontrolled split as `columnLayout`. Omit it for
   * the internal (uncontrolled) selection.
   */
  selectedIds?: readonly string[];
  /**
   * Selection change channel. Uncontrolled: an observer that fires with the
   * selected ids whenever the set changes — once on mount with the initial
   * (empty) selection, on every toggle/select-all, and on the automatic
   * reset when the search or a filter changes (the result set changed, so
   * stale ids never linger). Controlled (`selectedIds` provided): the
   * change-request handler — apply the ids to your state to accept.
   */
  onSelectionChange?: (selectedIds: string[]) => void;

  /* ── Customisation (common) ──────────────────────────────────────── */
  /**
   * Opt-in CSV export toolbar button. Pass `true` for defaults
   * (`export.csv`, current page) or an options object for filename/scope.
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
  /** Inline toolbar slot for custom controls (view toggles, etc.). */
  toolbar?: ReactNode;
  /**
   * Named regions of the toolbar, for controls that have to sit somewhere
   * specific rather than in the middle.
   *
   * `toolbar` is the middle region and stays exactly what it was: content
   * between the search input and the built-in buttons. These two are the
   * ends, which is where an app's own view switcher or a "back" control
   * belongs — ahead of everything, or after it.
   *
   * ```tsx
   * <DataTable
   *   toolbarSlots={{ start: <BackButton />, end: <HelpLink /> }}
   *   …
   * />
   * ```
   */
  toolbarSlots?: ToolbarSlots;
  /**
   * Let the user choose the row density from the toolbar. Defaults to off.
   *
   * The `density` prop is what the table renders; this is the control that
   * changes it. Pair it with `useDensityUrlState` and the choice survives a
   * reload and travels in a shared link.
   */
  densityChooser?: boolean;
  /** Called when the user picks a density. */
  onDensityChange?: (next: "comfortable" | "compact") => void;
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
  /** Confirmation handler for actions; defaults to `window.confirm`. */
  confirm?: ConfirmHandler;
  /** Number of skeleton rows while loading. Defaults to the page size. */
  skeletonRows?: number;
  /**
   * Top inset in px for the sticky header (`stickyHeader`) — e.g. the
   * height of an app bar it must clear. When the toolbar pins with the
   * header it parks at this inset too. Defaults to 0.
   */
  stickyTop?: number;
  /** Keep the desktop table header sticky while scrolling. Defaults to false (opt-in). */
  stickyHeader?: boolean;
  /**
   * Keep the toolbar (search, page size) sticky with the header.
   * Defaults to `stickyHeader` on page-scroll tables; pass `false` to
   * let the toolbar scroll away. Has no effect when the table already
   * scrolls in a box (`maxHeight`, or antd's native virtual scroller) —
   * the toolbar already sits outside that scroller.
   */
  stickyToolbar?: boolean;
  /** Scroll back to the table when search/filter/page changes. Defaults to true. */
  scrollToTopOnChange?: boolean;
  /** Extra gap below sticky chrome when scrolling back. Defaults to 8. */
  scrollTopGap?: number;
}
