/**
 * Body render composition.
 *
 * The render model stays here. Summary cells, viewport arithmetic and
 * browser measurement live beside this file and are re-exported so existing
 * imports keep the same names. Query and server entries do not import it.
 */

import type { PinOffset } from "../columns/columnLayoutModel";
import type { ColumnMetadata } from "../contracts/columns";
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
import { pinnedSummaryEntries } from "../rows/pinnedSummaryRows";
import type { TreeEntry } from "../tree/treeRows";
import {
  resolveVirtualRows,
  virtualColumnSpan,
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

export { readColumnViewport, RowPairMeasureController } from "./rowMeasurement";
export { SummaryCellsCache } from "./summaryCells";
export type {
  BodyChrome,
  BodyWindowKind,
  ColumnViewport,
  ColumnWindowPlan,
  WindowVirtualizer,
} from "./viewportState";
export {
  asSizeEstimator,
  bodyCanLoadMore,
  bodySentinelCount,
  bodyWindowKind,
  columnScrollTarget,
  columnWindowPlan,
  EndReachedLatch,
  estimateBodyItemSize,
  fetchNextBodyPage,
  hasLoadedChildren,
  isBodyEligible,
  keyedWindow,
  materializeWindowRows,
  pendingListSize,
  pinnedScrollRows,
  resolveBodyVirtualization,
  rowScrollTarget,
  rowWindow,
  virtualizeIgnoredOnPage,
  withSourceIndices,
} from "./viewportState";
