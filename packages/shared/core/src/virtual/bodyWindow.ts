/**
 * Body render and window plans.
 *
 * What a table body renders and how much of it: the render model every
 * layout derives first (columns, injected chrome, entries without the pinned
 * rows, the per-row cells), the summary cells, whether the body may be
 * windowed at all, which of the three windows is armed, where the infinite
 * sentinel counts, whether more rows can load, the scroll-to-row policy, and
 * the window arithmetic over a virtualizer's current slice. The virtualizer
 * itself is the binding's (TanStack's React or core package); every number
 * that comes out of it is computed here.
 */
import type { ColumnMetadata } from "../columnModel";
import type { PinOffset } from "../columns/columnLayoutModel";
import { DEFAULT_CARD_SIZE_PX, DEFAULT_ROW_SIZE_PX } from "../constants";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import {
  chromeColumnPlan,
  extraRowCoveredSlots,
  pinnedRowIds,
} from "../layout/chromeModel";
import {
  type AssemblyFns,
  bodyRowEntries,
  resolveAssembly,
} from "../layout/leanAssembly";
import type { BodyCell, GetCellSpan } from "../rows/cellSpan";
import type { ExtraRow } from "../rows/extraRows";
import { incrementalViewOf } from "../rows/incremental";
import { pinnedSummaryEntries } from "../rows/pinnedSummaryRows";
import type { RowPinState } from "../rows/rowPinModel";
import {
  estimateFromRowHeight,
  partitionPinnedRows,
} from "../rows/rowPresentation";
import type { RowHeight } from "../rows/rowStyle";
import type { TableSource } from "../source/TableSource";
import type { TreeEntry } from "../tree/treeRows";
import type { RowPairMeasurer } from "./rowPairModel";
import {
  type KeyedVirtualization,
  resolveVirtualRows,
  type TableVirtualization,
  virtualColumnSpan,
  type VirtualItemMeta,
  type VirtualTableRow,
} from "./virtualTableModel";

/* ── Render model ──────────────────────────────────────────────────── */

/**
 * What {@link chromeRenderModel} derives from.
 *
 * @public
 */
export interface ChromeRenderModelInput<
  TRow,
  TColumn extends ColumnMetadata<TRow>,
  TSelection,
> {
  /** The table: its visible columns, selection and labels. */
  readonly table: {
    readonly columns: readonly TColumn[];
    readonly selection: TSelection | null;
    readonly labels: object;
  };
  /** The rendered rows. */
  readonly rows: readonly TRow[];
  /** Row actions. */
  readonly rowActions?: readonly unknown[];
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** Virtual row entries, when windowed. */
  readonly rowEntries?: readonly VirtualTableRow<TRow>[];
  /** Row detail renderer. */
  readonly renderRowDetail?: unknown;
  /** Row detail expansion. */
  readonly expansion?: unknown;
  /** Horizontal window. */
  readonly columnWindow?: {
    readonly enabled: boolean;
    readonly columns: readonly TColumn[];
    readonly paddingStart: number;
    readonly paddingEnd: number;
  };
  /** Editing, for row mode's control column. */
  readonly editing?: { readonly rowEditing?: unknown };
  /** Reorder state, when composed. */
  readonly rowReorder?: unknown;
  /** Top-pinned data rows. */
  readonly pinnedTopRows?: readonly TRow[];
  /** Bottom-pinned data rows. */
  readonly pinnedBottomRows?: readonly TRow[];
  /** Summary rows above. */
  readonly pinnedSummaryTop?: readonly TRow[];
  /** Summary rows below. */
  readonly pinnedSummaryBottom?: readonly TRow[];
  /** Cell spans. */
  readonly getCellSpan?: GetCellSpan<TRow>;
  /** Pin lookup. */
  readonly pinOffset?: (key: string) => PinOffset | undefined;
  /** The tree, when rows are a tree. */
  readonly tree?: { readonly entries: readonly TreeEntry<TRow>[] };
  /** Grouped entries, when grouping renders. */
  readonly grouping?: { readonly entries: readonly GroupedFlatEntry<TRow>[] };
  /** Host extra rows. */
  readonly extraRows?: readonly ExtraRow[];
  /** Assembly functions the features composed. */
  readonly assembly?: Partial<AssemblyFns<TRow>>;
}

/**
 * The prelude every table and card renderer derives before rendering.
 *
 * @public
 */
export interface ChromeRenderModel<TRow, TColumn, TSelection, TLabels> {
  /** Visible columns, in order — the window when columns are windowed. */
  columns: readonly TColumn[];
  /** Selection state. */
  selection: TSelection | null;
  /** Resolved labels. */
  labels: TLabels;
  /** Whether a trailing actions column renders. */
  showActions: boolean;
  /** Whether the leading reorder column renders. */
  showReorder: boolean;
  /** Leading control cells before data. */
  leadingCells: number;
  /** Row entries, pinned rows removed. */
  entries: readonly VirtualTableRow<TRow>[];
  /** Spacer / detail colSpan. */
  columnSpan: number;
  /** Column-window spacer widths, when columns are windowed. */
  columnSpacers?: { start: number; end: number };
  /** Per-row body cells. */
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  /** Slots a continuing span owns on extras in front of a row. */
  extraCoveredSlots: ReadonlyMap<string, ReadonlySet<number>>;
}

/**
 * Derive the render prelude: windowed columns, the injected chrome, the
 * entries without the pinned rows, and the cells of every row that can
 * reach the screen — scroll, pinned, summary and grouped leaves alike.
 *
 * @public
 */
export function chromeRenderModel<
  TRow,
  TColumn extends ColumnMetadata<TRow>,
  TSelection,
  TLabels extends object,
>(
  props: ChromeRenderModelInput<TRow, TColumn, TSelection> & {
    readonly table: { readonly labels: TLabels };
  }
): ChromeRenderModel<TRow, TColumn, TSelection, TLabels> {
  const assembly = resolveAssembly(props.assembly);
  const { selection, labels } = props.table;
  // Windowed columns replace the full set for every renderer at once, so no
  // adapter has to know whether the horizontal axis is windowed.
  const windowed = props.columnWindow?.enabled === true;
  const columns = windowed
    ? (props.columnWindow?.columns ?? props.table.columns)
    : props.table.columns;
  const { showActions, showReorder, expandable, hasSelection, leadingCells } =
    chromeColumnPlan({
      rowActionCount: props.rowActions?.length ?? 0,
      rowEditing: props.editing?.rowEditing !== undefined,
      rowReorder: props.rowReorder !== undefined,
      rowDetail: Boolean(props.renderRowDetail && props.expansion),
      selection: Boolean(selection),
    });
  const pinnedIds = pinnedRowIds(
    props.getRowId,
    props.pinnedTopRows,
    props.pinnedBottomRows
  );
  const rawEntries = resolveVirtualRows(
    props.rows,
    props.getRowId,
    props.rowEntries
  );
  const entries =
    pinnedIds.size === 0
      ? rawEntries
      : rawEntries.filter((entry) => !pinnedIds.has(entry.key));
  const cellOptions = {
    columns: props.table.columns,
    getRowId: props.getRowId,
    getCellSpan: props.getCellSpan,
    pinOffset: props.pinOffset,
    windowKeys: windowed
      ? new Set(columns.map((column) => column.key))
      : undefined,
  };
  const cellsByRow = new Map<string, readonly BodyCell<TRow>[]>();
  const merge = (map: ReadonlyMap<string, readonly BodyCell<TRow>[]>) => {
    for (const [key, cells] of map) cellsByRow.set(key, cells);
  };
  const scrollRows = bodyRowEntries(entries, props.tree);
  const visualRows = [
    ...(props.pinnedTopRows ?? []),
    ...scrollRows.map((entry) => entry.row),
    ...(props.pinnedBottomRows ?? []),
  ];
  const visualIds = visualRows.map((row) => props.getRowId(row));
  merge(assembly.buildBodyCells({ ...cellOptions, rows: visualRows }));
  for (const entry of [
    ...pinnedSummaryEntries(props.pinnedSummaryTop ?? [], "top"),
    ...pinnedSummaryEntries(props.pinnedSummaryBottom ?? [], "bottom"),
  ]) {
    merge(
      assembly.buildBodyCells({
        ...cellOptions,
        getRowId: () => entry.id,
        rows: [entry.row],
      })
    );
  }
  // A grouped body renders `grouping.entries`, not the row list above — its
  // leaves reach the screen through a different array and would otherwise
  // have no cells built for them at all.
  const groupedRows = (props.grouping?.entries ?? []).filter(
    (entry): entry is Extract<GroupedFlatEntry<TRow>, { kind: "row" }> =>
      entry.kind === "row"
  );
  if (groupedRows.length > 0) {
    merge(
      assembly.buildBodyCells({
        ...cellOptions,
        rows: groupedRows.map((entry) => entry.row),
        firstRowIndex: groupedRows[0]?.index ?? 0,
      })
    );
  }
  const spannedCells = assembly.inflateBodyCellRowSpans(
    cellsByRow,
    visualIds,
    props.extraRows
  );
  if (spannedCells !== cellsByRow) {
    cellsByRow.clear();
    merge(spannedCells);
  }
  const extraCoveredSlots = extraRowCoveredSlots(
    props.extraRows,
    (beforeRowId) =>
      assembly.extraCoveredTableSlots(beforeRowId, {
        visualIds,
        cellsByRow,
        extraRows: props.extraRows,
        leadingCells,
      })
  );
  return {
    columns,
    selection,
    labels,
    showActions,
    showReorder,
    leadingCells,
    entries,
    columnSpan:
      virtualColumnSpan(
        columns.length,
        hasSelection,
        showActions,
        expandable,
        showReorder
      ) + (windowed ? 2 : 0),
    columnSpacers: windowed
      ? {
          start: props.columnWindow?.paddingStart ?? 0,
          end: props.columnWindow?.paddingEnd ?? 0,
        }
      : undefined,
    cellsByRow,
    extraCoveredSlots,
  };
}

/* ── Summary cells ─────────────────────────────────────────────────── */

/**
 * Summary-row cells, recomputed only when the rendered rows change.
 *
 * An incremental view that already carries aggregates wins. Otherwise the
 * host's builder runs — read at call time, since hosts pass it inline and
 * a fresh identity every render must not re-run an aggregate that walks the
 * whole filtered set.
 *
 * @public
 */
export class SummaryCellsCache<TCells> {
  #rows: readonly unknown[] | undefined;
  #enabled = false;
  #fromView: TCells | undefined;
  #cells: TCells | undefined;

  /**
   * The summary cells for these rows.
   *
   * @param summaryRow - The host's builder, or `undefined` when off.
   * @param rows - The rows the summary describes.
   * @returns The cells, or `undefined` with no builder and no view aggregates.
   */
  read<TRow>(
    summaryRow: ((rows: readonly TRow[]) => TCells) | undefined,
    rows: readonly TRow[]
  ): TCells | undefined {
    const fromView = incrementalViewOf(rows)?.aggregates as TCells | undefined;
    const enabled = summaryRow !== undefined && fromView === undefined;
    if (
      rows === this.#rows &&
      enabled === this.#enabled &&
      fromView === this.#fromView
    ) {
      return this.#cells;
    }
    this.#rows = rows;
    this.#enabled = enabled;
    this.#fromView = fromView;
    this.#cells = enabled ? summaryRow?.(rows) : fromView;
    return this.#cells;
  }
}

/* ── Body eligibility and the sentinel ─────────────────────────────── */

/** The chrome fields the body plan reads. */
export interface BodyChrome<TRow> {
  readonly source: Pick<
    TableSource<TRow>,
    | "rows"
    | "error"
    | "paginationMode"
    | "hasNextPage"
    | "isFetchingNextPage"
    | "fetchNextPage"
  >;
  readonly isPaged: boolean;
  readonly isMobile: boolean;
  readonly body: string;
  readonly grouping?: { readonly entries: readonly GroupedFlatEntry<TRow>[] };
  readonly tree?: {
    readonly entries: readonly { readonly row: TRow; readonly key: string }[];
  };
}

/**
 * Whether the body is a real row or card list a window can apply to.
 *
 * A paged body normally needs none: the page size already bounds it.
 * Grouping and trees break that bound — a page of thirty rows walks out as
 * a hundred and forty entries — so an expanded page is eligible too.
 *
 * @public
 */
export function isBodyEligible<TRow>(
  chrome: Pick<
    BodyChrome<TRow>,
    "grouping" | "tree" | "isPaged" | "source" | "body"
  >
): boolean {
  const expanded = chrome.grouping !== undefined || chrome.tree !== undefined;
  return (
    (!chrome.isPaged || expanded) &&
    !chrome.source.error &&
    (chrome.body === "desktop" || chrome.body === "mobile")
  );
}

/**
 * Whether `virtualize` was asked for on a body it cannot window: a paged,
 * flat table.
 *
 * @public
 */
export function virtualizeIgnoredOnPage<TRow>(
  virtualize: boolean,
  chrome: Pick<BodyChrome<TRow>, "grouping" | "tree" | "source">
): boolean {
  const expanded = chrome.grouping !== undefined || chrome.tree !== undefined;
  return virtualize && chrome.source.paginationMode === "paged" && !expanded;
}

/**
 * A card's height on a phone, a row's on a desktop — or the host's
 * `rowHeight` — for the item at a window index.
 *
 * @public
 */
export function estimateBodyItemSize<TRow>(
  chrome: Pick<BodyChrome<TRow>, "isMobile" | "grouping" | "tree">,
  options: {
    readonly estimateCardSize?: number;
    readonly estimateRowSize?: number;
    readonly rowHeight?: RowHeight<TRow>;
  },
  scrollRows: readonly TRow[]
): (index: number) => number {
  const fallback = chrome.isMobile
    ? (options.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
    : (options.estimateRowSize ?? DEFAULT_ROW_SIZE_PX);
  return estimateFromRowHeight(options.rowHeight, fallback, (index) => {
    if (chrome.grouping) {
      const entry = chrome.grouping.entries[index];
      if (entry?.kind === "row") return { row: entry.row, index: entry.index };
      return undefined;
    }
    if (chrome.tree) {
      const entry = chrome.tree.entries[index];
      return entry ? { row: entry.row, index } : undefined;
    }
    const row = scrollRows[index];
    return row === undefined ? undefined : { row, index };
  });
}

/**
 * How many items the infinite sentinel counts as rendered: grouped entries
 * when grouping renders, the source rows otherwise.
 *
 * @public
 */
export function bodySentinelCount<TRow>(
  chrome: Pick<BodyChrome<TRow>, "grouping" | "source">
): number {
  if (chrome.grouping) return chrome.grouping.entries.length;
  return chrome.source.rows.length;
}

/**
 * Whether the load-more sentinel applies: an infinite list with no error,
 * and — when a window is armed inside a bounded box — not at all, because
 * the window itself reports reaching the end.
 *
 * @public
 */
export function bodyCanLoadMore(
  chrome: {
    readonly isPaged: boolean;
    readonly source: { readonly error?: unknown };
  },
  boxVirtual = false
): boolean {
  return !chrome.isPaged && !chrome.source.error && !boxVirtual;
}

/**
 * Fetch the next infinite page when the source has one and is not already
 * fetching it.
 *
 * @public
 */
export function fetchNextBodyPage(
  source: Pick<
    TableSource<unknown>,
    "hasNextPage" | "isFetchingNextPage" | "fetchNextPage"
  >
): void {
  if (source.hasNextPage && !source.isFetchingNextPage) source.fetchNextPage();
}

/**
 * Pinned rows and the list the window scrolls: every row when nothing is
 * pinned.
 *
 * @public
 */
export function pinnedScrollRows<TRow>(
  rows: readonly TRow[],
  pinState: RowPinState | undefined,
  rowKey: (row: TRow) => string
): { top: readonly TRow[]; scroll: readonly TRow[]; bottom: readonly TRow[] } {
  if (!pinState) return { top: [], scroll: rows, bottom: [] };
  return partitionPinnedRows(rows, pinState, rowKey);
}

/**
 * Whether a tree row's children are already in the data.
 *
 * @public
 */
export function hasLoadedChildren<TRow>(
  row: TRow,
  rows: readonly TRow[],
  options: {
    readonly getChildren?: (row: TRow) => readonly TRow[] | undefined;
    readonly getParentId?: (row: TRow) => string | undefined;
    readonly rowKey: (row: TRow) => string;
  }
): boolean {
  const nested = options.getChildren?.(row);
  if (nested !== undefined) return nested.length > 0;
  const { getParentId, rowKey } = options;
  if (!getParentId) return false;
  const id = rowKey(row);
  return rows.some((candidate) => getParentId(candidate) === id);
}

/* ── Which window is armed ─────────────────────────────────────────── */

/**
 * Which of the body's three windows is armed — grouped entries, tree
 * entries or flat rows, at most one — or none.
 *
 * @public
 */
export type BodyWindowKind = "grouped" | "tree" | "flat" | "none";

/**
 * Which window a body arms. Grouping outranks a tree; a flat window covers
 * everything else.
 *
 * @public
 */
export function bodyWindowKind<TRow>(
  virtualize: boolean,
  chrome: Pick<
    BodyChrome<TRow>,
    "grouping" | "tree" | "isPaged" | "source" | "body"
  >
): BodyWindowKind {
  if (!virtualize || !isBodyEligible(chrome)) return "none";
  if (chrome.grouping) return "grouped";
  if (chrome.tree) return "tree";
  return "flat";
}

/**
 * The row window a table renders when a keyed (grouped or tree) window is
 * armed: that window's spacers stand in for the flat one.
 *
 * @public
 */
export function resolveBodyVirtualization<TRow>(
  keyed: KeyedVirtualization,
  flat: TableVirtualization<TRow>
): TableVirtualization<TRow> {
  if (!keyed.enabled) return flat;
  return {
    enabled: true,
    rows: [],
    paddingTop: keyed.paddingTop,
    paddingBottom: keyed.paddingBottom,
    measureElement: keyed.measureElement,
  };
}

/**
 * Point each windowed entry at its row's index in the page, so ARIA and
 * focus address the dataset rather than the unpinned scroll list.
 *
 * @public
 */
export function withSourceIndices<TRow>(
  virtualization: TableVirtualization<TRow>,
  sourceRows: readonly TRow[],
  rowKey: (row: TRow) => string
): TableVirtualization<TRow> {
  const byId = new Map<string, number>();
  sourceRows.forEach((row, index) => byId.set(rowKey(row), index));
  return {
    ...virtualization,
    rows: virtualization.rows.map((entry) => ({
      ...entry,
      sourceIndex: byId.get(entry.key) ?? entry.index,
    })),
  };
}

/**
 * Where to scroll to bring one row into the window, or `undefined` when it
 * is already rendered (a call never fights the reader) or not windowed.
 *
 * @public
 */
export function rowScrollTarget<TRow>(
  row: TRow,
  rowKey: (row: TRow) => string,
  flat: {
    readonly virtualization: Pick<
      TableVirtualization<TRow>,
      "enabled" | "rows"
    >;
    readonly rows: readonly TRow[];
  },
  keyed: {
    readonly virtualization: Pick<KeyedVirtualization, "enabled" | "indices">;
    readonly keys: readonly string[];
  }
): { readonly window: "flat" | "keyed"; readonly index: number } | undefined {
  const id = rowKey(row);
  if (flat.virtualization.enabled) {
    if (flat.virtualization.rows.some((entry) => entry.key === id))
      return undefined;
    const index = flat.rows.findIndex((candidate) => rowKey(candidate) === id);
    return index >= 0 ? { window: "flat", index } : undefined;
  }
  if (!keyed.virtualization.enabled) return undefined;
  const index = keyed.keys.indexOf(id);
  if (index >= 0 && !keyed.virtualization.indices.includes(index)) {
    return { window: "keyed", index };
  }
  return undefined;
}

/* ── Window arithmetic ─────────────────────────────────────────────── */

/**
 * A virtualizer as the window arithmetic reads it — TanStack's, in either
 * framework package, has all of these.
 *
 * @public
 */
export interface WindowVirtualizer {
  /** Total list size, estimated where unmeasured. */
  getTotalSize(): number;
  /** Options; only the scroll margin is read. */
  readonly options: { readonly scrollMargin?: number };
  /** Measure one rendered item. */
  readonly measureElement: (node: Element | null) => void;
}

/**
 * A per-index size reader from a constant or a function.
 *
 * @public
 */
export function asSizeEstimator(
  estimateSize: number | ((index: number) => number)
): (index: number) => number {
  return typeof estimateSize === "function" ? estimateSize : () => estimateSize;
}

/**
 * Spacer height while a window is armed but has produced no slice yet.
 * Never 0 for a non-empty list: a 0-height list never intersects the
 * viewport, so the window would never appear.
 *
 * @public
 */
export function pendingListSize(
  count: number,
  measured: number,
  estimateSize: number | ((index: number) => number)
): number {
  if (measured > 0) return measured;
  if (count === 0) return 0;
  return count * asSizeEstimator(estimateSize)(0);
}

/** The spacers either side of a live slice. */
function slicePadding(
  virtualizer: WindowVirtualizer,
  items: readonly Pick<VirtualItemMeta, "start" | "end">[]
): { paddingTop: number; paddingBottom: number } {
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return { paddingTop: 0, paddingBottom: 0 };
  const margin = virtualizer.options.scrollMargin ?? 0;
  return {
    paddingTop: Math.max(0, first.start - margin),
    paddingBottom: Math.max(
      0,
      virtualizer.getTotalSize() - (last.end - margin)
    ),
  };
}

/**
 * The rows a flat window materializes: every row when off, nothing before
 * the first slice, else the rows under the virtualizer's items.
 *
 * @public
 */
export function materializeWindowRows<TRow>(
  rows: readonly TRow[],
  rowKey: (row: TRow) => string,
  enabled: boolean,
  items: readonly VirtualItemMeta[]
): readonly VirtualTableRow<TRow>[] {
  if (!enabled) {
    return rows.map((row, index) => ({ row, index, key: rowKey(row) }));
  }
  return items.flatMap((item) => {
    const row = rows[item.index];
    if (row === undefined) return [];
    return [{ row, index: item.index, key: rowKey(row), virtualItem: item }];
  });
}

/**
 * The window a flat table renders from the virtualizer's current slice.
 *
 * Armed with no slice yet, it holds the list's height with a spacer rather
 * than mounting every row. A row that can expand is measured as a pair; one
 * that cannot keeps the virtualizer's cheaper element measurement.
 *
 * @public
 */
export function rowWindow<TRow>(input: {
  readonly enabled: boolean;
  readonly rows: readonly VirtualTableRow<TRow>[];
  readonly count: number;
  readonly virtualizer: WindowVirtualizer;
  readonly items: readonly VirtualItemMeta[];
  readonly estimateSize: number | ((index: number) => number);
  readonly expandable: boolean;
  readonly measureRowPair: RowPairMeasurer | undefined;
}): TableVirtualization<TRow> {
  if (!input.enabled) {
    return {
      enabled: false,
      rows: input.rows,
      paddingTop: 0,
      paddingBottom: 0,
    };
  }
  const measure = {
    measureElement: input.expandable
      ? undefined
      : input.virtualizer.measureElement,
    measureRowPair: input.expandable ? input.measureRowPair : undefined,
  };
  if (input.items.length === 0) {
    return {
      enabled: true,
      rows: input.rows,
      paddingTop: 0,
      paddingBottom: pendingListSize(
        input.count,
        input.virtualizer.getTotalSize(),
        input.estimateSize
      ),
      ...measure,
    };
  }
  return {
    enabled: true,
    rows: input.rows,
    ...slicePadding(input.virtualizer, input.items),
    ...measure,
  };
}

/**
 * The window a keyed list (grouped or tree entries) renders from the
 * virtualizer's current slice.
 *
 * @public
 */
export function keyedWindow(input: {
  readonly enabled: boolean;
  readonly count: number;
  readonly virtualizer: WindowVirtualizer;
  readonly items: readonly VirtualItemMeta[];
  readonly estimateSize: number | ((index: number) => number);
}): KeyedVirtualization {
  if (!input.enabled) {
    return {
      enabled: false,
      indices: Array.from({ length: input.count }, (_, index) => index),
      paddingTop: 0,
      paddingBottom: 0,
    };
  }
  if (input.items.length === 0) {
    return {
      enabled: true,
      indices: [],
      paddingTop: 0,
      paddingBottom: pendingListSize(
        input.count,
        input.virtualizer.getTotalSize(),
        input.estimateSize
      ),
      measureElement: input.virtualizer.measureElement,
    };
  }
  return {
    enabled: true,
    indices: input.items.map((item) => item.index),
    ...slicePadding(input.virtualizer, input.items),
    measureElement: input.virtualizer.measureElement,
  };
}

/**
 * Tells a window's owner once per row count that the last item is in view.
 *
 * The slice is a fresh array every render, so a naive check would fire on
 * every render while the last row stays in view. This re-arms only when more
 * rows load (the count grows) or the reader scrolls back off the end.
 *
 * @public
 */
export class EndReachedLatch {
  #notifiedAtCount = -1;

  /**
   * Check the current slice.
   *
   * @param active - Whether the window has a slice.
   * @param count - Items in the list.
   * @param lastIndex - The last item in the slice, if any.
   * @returns Whether to fetch more now.
   */
  check(
    active: boolean,
    count: number,
    lastIndex: number | undefined
  ): boolean {
    if (!active || count === 0) return false;
    if (lastIndex === undefined || lastIndex < count - 1) {
      this.#notifiedAtCount = -1;
      return false;
    }
    if (this.#notifiedAtCount === count) return false;
    this.#notifiedAtCount = count;
    return true;
  }
}

/* ── Column window ─────────────────────────────────────────────────── */

/** How wide a column is assumed to be when nothing has measured it. */
const DEFAULT_COLUMN_WIDTH = 160;

/**
 * The horizontal viewport: how far it has scrolled and how wide it is.
 *
 * @public
 */
export interface ColumnViewport {
  /** Distance scrolled, in either direction. */
  readonly start: number;
  /** Visible width. */
  readonly width: number;
}

/**
 * Read a scroll container's horizontal viewport. `scrollLeft` is negative
 * in RTL, so its magnitude is the distance scrolled either way.
 *
 * @public
 */
export function readColumnViewport(element: {
  readonly scrollLeft: number;
  readonly clientWidth: number;
}): ColumnViewport {
  return { start: Math.abs(element.scrollLeft), width: element.clientWidth };
}

/**
 * The windowed columns and the space the rest occupies.
 *
 * @public
 */
export interface ColumnWindowPlan<TColumn> {
  /** Whether the columns are a window rather than everything. */
  enabled: boolean;
  /** The columns to render, pinned ones first. */
  columns: readonly TColumn[];
  /** Width of the spacer before the window. */
  paddingStart: number;
  /** Width of the spacer after it. */
  paddingEnd: number;
}

/**
 * Window the columns to what is scrolled into view.
 *
 * Pinned columns are always rendered — they are on screen whatever the
 * scroll — so the window covers the scrollable columns only. The spacers
 * are logical (leading / trailing), which is what makes a wide RTL table
 * scroll correctly.
 *
 * @public
 */
export function columnWindowPlan<
  TColumn extends { readonly key: string },
>(input: {
  readonly columns: readonly TColumn[];
  readonly enabled: boolean;
  readonly viewport: ColumnViewport;
  readonly widths?: Readonly<Record<string, number>>;
  readonly pinnedKeys?: ReadonlySet<string>;
  readonly pinnedSides?: Readonly<Record<string, "start" | "end">>;
  readonly leadingWidth?: number;
  readonly trailingWidth?: number;
  readonly overscan?: number;
}): ColumnWindowPlan<TColumn> {
  const { columns, widths, pinnedKeys, overscan = 3 } = input;
  const pinnedWidth = columns.reduce(
    (total, column) =>
      total +
      (pinnedKeys?.has(column.key)
        ? (widths?.[column.key] ?? DEFAULT_COLUMN_WIDTH)
        : 0),
    0
  );
  const leading = input.leadingWidth ?? 0;
  const viewport = {
    start: Math.max(0, input.viewport.start - leading),
    width: Math.max(
      0,
      input.viewport.width -
        pinnedWidth -
        Math.max(0, leading - input.viewport.start) -
        (input.trailingWidth ?? 0)
    ),
  };
  if (!input.enabled || viewport.width === 0) {
    return { enabled: false, columns, paddingStart: 0, paddingEnd: 0 };
  }
  const widthOf = (column: TColumn | undefined) =>
    (column && widths?.[column.key]) ?? DEFAULT_COLUMN_WIDTH;
  const pinned = columns.filter((column) => pinnedKeys?.has(column.key));
  const scrollable = columns.filter((column) => !pinnedKeys?.has(column.key));

  let offset = 0;
  let first = scrollable.length;
  let last = -1;
  const offsets: number[] = [];
  for (const [index, column] of scrollable.entries()) {
    const width = widthOf(column);
    offsets.push(offset);
    const end = offset + width;
    if (end > viewport.start && offset < viewport.start + viewport.width) {
      first = Math.min(first, index);
      last = Math.max(last, index);
    }
    offset = end;
  }
  if (last === -1) {
    // Scrolled past everything (or nothing measurable yet): show the head of
    // the table rather than an empty row.
    first = 0;
    last = Math.min(scrollable.length - 1, overscan * 2);
  }
  const from = Math.max(0, first - overscan);
  const to = Math.min(scrollable.length - 1, last + overscan);
  return {
    enabled: true,
    columns: [
      ...pinned.filter((column) => input.pinnedSides?.[column.key] !== "end"),
      ...scrollable.slice(from, to + 1),
      ...pinned.filter((column) => input.pinnedSides?.[column.key] === "end"),
    ],
    paddingStart: offsets[from] ?? 0,
    paddingEnd: Math.max(
      0,
      offset - ((offsets[to] ?? 0) + widthOf(scrollable[to] ?? columns[0]))
    ),
  };
}

/* ── Row-pair measurement ──────────────────────────────────────────── */

/**
 * Measures each windowed row together with its open detail panel.
 *
 * A `<tr>` cannot contain its detail panel, so one item is two elements;
 * measuring the row alone reports 56px for something 300px tall and scroll
 * positions drift. Both halves are observed and their combined height is
 * reported through `resizeItem`, on every resize of either half.
 *
 * @public
 */
export class RowPairMeasureController {
  readonly #pairs = new Map<
    number,
    { row: Element | null; detail: Element | null }
  >();
  readonly #owners = new Map<Element, number>();
  #observer: ResizeObserver | null = null;
  readonly #resizeItem: ((index: number, size: number) => void) | undefined;

  /**
   * @param resizeItem - Reports an item's real size to the virtualizer.
   */
  constructor(resizeItem: ((index: number, size: number) => void) | undefined) {
    this.#resizeItem = resizeItem;
  }

  /** Report one item's combined height. */
  report(index: number): void {
    if (!this.#resizeItem) return;
    const pair = this.#pairs.get(index);
    if (!pair?.row) return;
    const total =
      pair.row.getBoundingClientRect().height +
      (pair.detail?.getBoundingClientRect().height ?? 0);
    if (total > 0) this.#resizeItem(index, total);
  }

  /**
   * Start observing. Elements attached before this runs are picked up, since
   * refs attach before effects.
   *
   * @returns A function that stops observing.
   */
  connect(): () => void {
    if (typeof ResizeObserver === "undefined") return () => undefined;
    const instance = new ResizeObserver((entries) => {
      const touched = new Set<number>();
      for (const entry of entries) {
        const index = this.#owners.get(entry.target);
        if (index !== undefined) touched.add(index);
      }
      for (const index of touched) this.report(index);
    });
    this.#observer = instance;
    for (const element of this.#owners.keys()) instance.observe(element);
    return () => {
      instance.disconnect();
      this.#observer = null;
    };
  }

  /**
   * Attach one half of an item, or detach it with `null`.
   *
   * @param index - The item.
   * @param half - The row or its detail.
   * @param node - The element, or `null`.
   */
  attach(index: number, half: "row" | "detail", node: Element | null): void {
    const pair = this.#pairs.get(index) ?? { row: null, detail: null };
    const previous = pair[half];
    if (previous && previous !== node) {
      this.#observer?.unobserve(previous);
      this.#owners.delete(previous);
    }
    pair[half] = node;
    this.#pairs.set(index, pair);
    if (node) {
      this.#owners.set(node, index);
      this.#observer?.observe(node);
    }
    // Report straight away: the first paint is when a wrong height is most
    // visible, and a resize may never come.
    this.report(index);
  }
}

/** Logical scroll offset needed to reveal an unpinned column inside its unobscured viewport. @public */
export function columnScrollTarget(input: {
  readonly columns: readonly { readonly key: string }[];
  readonly columnKey: string;
  readonly viewport: ColumnViewport;
  readonly widths?: Readonly<Record<string, number>>;
  readonly pinnedKeys?: ReadonlySet<string>;
  /** Width preceding data columns, including injected selection/reorder controls. */
  readonly leadingWidth?: number;
  /** Visible reserved trailing controls outside the data viewport. */
  readonly trailingWidth?: number;
}): number | undefined {
  if (input.pinnedKeys?.has(input.columnKey)) return undefined;
  const pinnedWidth = input.columns.reduce(
    (total, column) =>
      total +
      (input.pinnedKeys?.has(column.key)
        ? (input.widths?.[column.key] ?? DEFAULT_COLUMN_WIDTH)
        : 0),
    0
  );
  const usableWidth = Math.max(
    0,
    input.viewport.width - pinnedWidth - (input.trailingWidth ?? 0)
  );
  const scrollable = input.columns.filter(
    (column) => !input.pinnedKeys?.has(column.key)
  );
  const index = scrollable.findIndex(
    (column) => column.key === input.columnKey
  );
  if (index < 0) return undefined;
  const widthOf = (column: { readonly key: string }) =>
    input.widths?.[column.key] ?? DEFAULT_COLUMN_WIDTH;
  const start =
    (input.leadingWidth ?? 0) +
    scrollable
      .slice(0, index)
      .reduce((offset, column) => offset + widthOf(column), 0);
  return columnRevealOffset(
    start,
    widthOf(scrollable[index]!),
    input.viewport.start,
    usableWidth
  );
}

function columnRevealOffset(
  start: number,
  width: number,
  viewportStart: number,
  usableWidth: number
): number | undefined {
  if (width > usableWidth) return start === viewportStart ? undefined : start;
  if (start < viewportStart) return start;
  if (start + width > viewportStart + usableWidth)
    return Math.max(0, start + width - usableWidth);
  return undefined;
}
