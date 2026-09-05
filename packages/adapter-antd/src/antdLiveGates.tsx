/**
 * Mount antd interaction hooks in-tree, the same way the shell does.
 *
 * antd builds its chrome by hand, but the engines — edit history, find, grid
 * focus, export — still have to stay behind live slots. This file imports the
 * slots and the inert stubs, never the hooks, so the adapter root graph
 * matches the other kits.
 */
import { asBatchGesture } from "@adapttable/react";
import type {
  BatchRowEdit,
  EditHistoryState,
  FindInTableState,
} from "@adapttable/react";
import type { GridFocusState } from "@adapttable/react/adapter";
import type {
  SelectionStats,
  TableLabels,
  TableSource,
} from "@adapttable/core";
import {
  CELL_NAV_LIVE,
  type CellNavLiveSlotProps,
  type ColumnDef,
  DISABLED_EXPORT,
  DISABLED_FIND,
  disabledHistory,
  EDIT_HISTORY_LIVE,
  type EditHistoryLiveSlotProps,
  EXPORT_LIVE,
  type ExportHandlerState,
  type ExportLiveSlotProps,
  type FeatureHostState,
  type FeatureProps,
  FeatureSlot,
  FIND_LIVE,
  type FindLiveSlotProps,
  SELECTION_STATS_LIVE,
  type SelectionStatsLiveSlotProps,
  useFeatureSlotFilled,
  type UseGridFocusOptions,
  windowedTableAria,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

import type { DataTableProps } from "./types";

type LiveProps<TRow> = DataTableProps<TRow> & FeatureProps<TRow>;

/**
 * Record edits before chrome runs, so the editing bundle sees the
 * recording commit channel.
 */
export function AntdHistoryGate<TRow>({
  editHistory,
  columns,
  onCellEdit,
  onBatchEdit,
  children,
}: {
  readonly editHistory: boolean | { depth?: number } | undefined;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly onCellEdit:
    ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
  readonly onBatchEdit:
    ((edits: readonly BatchRowEdit<TRow>[]) => unknown) | undefined;
  readonly children: (result: {
    history: EditHistoryState<TRow>;
    onCellEdit:
      ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
    onBatchEdit:
      ((edits: readonly BatchRowEdit<TRow>[]) => unknown) | undefined;
  }) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(EDIT_HISTORY_LIVE);
  const apply = (result: {
    history: EditHistoryState<TRow>;
    onCellEdit:
      ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
  }) =>
    children({
      ...result,
      onBatchEdit: asBatchGesture(onBatchEdit, result.history.record),
    });
  const historyProps = {
    editHistory,
    columns,
    onCellEdit,
    children: apply,
  } as unknown as EditHistoryLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={EDIT_HISTORY_LIVE} props={historyProps} />
  ) : (
    apply({ history: disabledHistory(), onCellEdit })
  );
}

export interface AntdLiveState {
  find: FindInTableState;
  gridFocus: GridFocusState;
  exportHandler: ExportHandlerState;
  stats: SelectionStats | null;
}

/**
 * Find, cell navigation and export — each only when its feature filled the
 * live slot. Empty slots hand the table the same inert objects the shell uses.
 */
export function AntdInteractionGate<TRow>({
  props,
  source,
  columns,
  rows,
  firstRowIndex,
  rowCount,
  columnsWindowed,
  urlAdapter,
  history,
  getRowId,
  selectedIds,
  allColumns,
  grouping,
  tree,
  featureHost,
  labels,
  pageOnly,
  children,
}: {
  readonly props: LiveProps<TRow>;
  readonly source: TableSource<TRow>;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rows: readonly TRow[];
  readonly firstRowIndex: number;
  readonly rowCount: number;
  readonly columnsWindowed: boolean;
  readonly urlAdapter: NonNullable<LiveProps<TRow>["urlAdapter"]>;
  readonly history: EditHistoryState<TRow>;
  readonly getRowId: (row: TRow) => string;
  readonly selectedIds: ReadonlySet<string> | undefined;
  readonly allColumns: readonly ColumnDef<TRow>[];
  readonly grouping: unknown;
  readonly tree: unknown;
  readonly featureHost: FeatureHostState | undefined;
  readonly labels: Required<TableLabels>;
  readonly pageOnly: boolean;
  readonly children: (live: AntdLiveState) => ReactNode;
}): ReactNode {
  return (
    <FindStage
      props={props}
      columns={columns}
      rows={rows}
      firstRowIndex={firstRowIndex}
      urlAdapter={urlAdapter}
    >
      {(find) => (
        <NavStage
          props={props}
          columns={columns}
          rows={rows}
          firstRowIndex={firstRowIndex}
          rowCount={rowCount}
          columnsWindowed={columnsWindowed}
          history={history}
          find={find}
          labels={labels}
        >
          {(gridFocus) => (
            <AfterNav
              props={props}
              source={source}
              columns={columns}
              rows={rows}
              firstRowIndex={firstRowIndex}
              gridFocus={gridFocus}
              getRowId={getRowId}
              selectedIds={selectedIds}
              allColumns={allColumns}
              grouping={grouping}
              tree={tree}
              featureHost={featureHost}
              labels={labels}
              pageOnly={pageOnly}
              find={find}
            >
              {children}
            </AfterNav>
          )}
        </NavStage>
      )}
    </FindStage>
  );
}

function AfterNav<TRow>({
  props,
  source,
  columns,
  rows,
  firstRowIndex,
  gridFocus,
  getRowId,
  selectedIds,
  allColumns,
  grouping,
  tree,
  featureHost,
  labels,
  pageOnly,
  find,
  children,
}: {
  readonly props: LiveProps<TRow>;
  readonly source: TableSource<TRow>;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rows: readonly TRow[];
  readonly firstRowIndex: number;
  readonly gridFocus: GridFocusState;
  readonly getRowId: (row: TRow) => string;
  readonly selectedIds: ReadonlySet<string> | undefined;
  readonly allColumns: readonly ColumnDef<TRow>[];
  readonly grouping: unknown;
  readonly tree: unknown;
  readonly featureHost: FeatureHostState | undefined;
  readonly labels: Required<TableLabels>;
  readonly pageOnly: boolean;
  readonly find: FindInTableState;
  readonly children: (live: AntdLiveState) => ReactNode;
}): ReactNode {
  return (
    <ExportStage
      props={props}
      source={source}
      columns={columns}
      firstRowIndex={firstRowIndex}
      gridFocus={gridFocus}
      getRowId={getRowId}
      selectedIds={selectedIds}
      allColumns={allColumns}
      grouping={grouping}
      tree={tree}
      featureHost={featureHost}
      labels={labels}
      pageOnly={pageOnly}
    >
      {(exportHandler) => (
        <StatsStage
          columns={columns}
          rows={rows}
          firstRowIndex={firstRowIndex}
          gridFocus={gridFocus}
        >
          {(stats) => children({ find, gridFocus, exportHandler, stats })}
        </StatsStage>
      )}
    </ExportStage>
  );
}

function FindStage<TRow>({
  props,
  columns,
  rows,
  firstRowIndex,
  urlAdapter,
  children,
}: {
  readonly props: LiveProps<TRow>;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rows: readonly TRow[];
  readonly firstRowIndex: number;
  readonly urlAdapter: NonNullable<LiveProps<TRow>["urlAdapter"]>;
  readonly children: (find: FindInTableState) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(FIND_LIVE);
  const findProps = {
    enabled: true,
    rows,
    columns,
    firstRowIndex,
    urlAdapter,
    urlKey: props.urlKey,
    children,
  } as unknown as FindLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={FIND_LIVE} props={findProps} />
  ) : (
    children(DISABLED_FIND)
  );
}

function NavStage<TRow>({
  props,
  columns,
  rows,
  firstRowIndex,
  rowCount,
  columnsWindowed,
  history,
  find,
  labels,
  children,
}: {
  readonly props: LiveProps<TRow>;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rows: readonly TRow[];
  readonly firstRowIndex: number;
  readonly rowCount: number;
  readonly columnsWindowed: boolean;
  readonly history: EditHistoryState<TRow>;
  readonly find: FindInTableState;
  readonly labels: Required<TableLabels>;
  readonly children: (gridFocus: GridFocusState) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CELL_NAV_LIVE);
  const options: Omit<
    UseGridFocusOptions<TRow>,
    "enabled" | "onPaste" | "onFill" | "onUndo" | "onRedo" | "onFind"
  > = {
    headerCheckbox: props.columnSelectionCheckbox === true,
    rowCount,
    columns,
    rows,
    firstRowIndex,
    dir: props.dir,
    labels,
    columnsWindowed,
  };
  const navProps = {
    options,
    hostProps: props,
    record: history.record,
    undo: history.undo,
    redo: history.redo,
    onFind: find.openBar,
    matchKeys: find.matchKeys,
    currentMatch: find.current,
    children,
  } as unknown as CellNavLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={CELL_NAV_LIVE} props={navProps} />
  ) : (
    children(
      windowedTableAria({
        rowCount,
        rowsLength: rows.length,
        columnsLength: columns.length,
        columnsWindowed,
        firstRowIndex,
      })
    )
  );
}

function ExportStage<TRow>({
  props,
  source,
  columns,
  firstRowIndex,
  gridFocus,
  getRowId,
  selectedIds,
  allColumns,
  grouping,
  tree,
  featureHost,
  labels,
  pageOnly,
  children,
}: {
  readonly props: LiveProps<TRow>;
  readonly source: TableSource<TRow>;
  readonly columns: readonly ColumnDef<TRow>[];
  readonly firstRowIndex: number;
  readonly gridFocus: GridFocusState;
  readonly getRowId: (row: TRow) => string;
  readonly selectedIds: ReadonlySet<string> | undefined;
  readonly allColumns: readonly ColumnDef<TRow>[];
  readonly grouping: unknown;
  readonly tree: unknown;
  readonly featureHost: FeatureHostState | undefined;
  readonly labels: TableLabels;
  readonly pageOnly: boolean;
  readonly children: (exportHandler: ExportHandlerState) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(EXPORT_LIVE);
  const exportProps = {
    exportCsv: props.exportCsv,
    source,
    columns,
    context: {
      selectedIds,
      getRowId,
      allColumns,
      range: gridFocus.range,
      firstRowIndex,
      getCellSpan: props.getCellSpan,
      grouping,
      tree,
      groupTotal: labels.groupTotal,
      summaryRow: props.summaryRow,
    },
    featureHost,
    labels,
    pageOnly,
    children,
  } as unknown as ExportLiveSlotProps;
  return filled ? (
    <FeatureSlot slot={EXPORT_LIVE} props={exportProps} />
  ) : (
    children(DISABLED_EXPORT)
  );
}

function StatsStage<TRow>({
  columns,
  rows,
  firstRowIndex,
  gridFocus,
  children,
}: {
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rows: readonly TRow[];
  readonly firstRowIndex: number;
  readonly gridFocus: GridFocusState;
  readonly children: (stats: SelectionStats | null) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(SELECTION_STATS_LIVE);
  const statsProps = {
    range: gridFocus.range,
    rows,
    columns,
    firstRowIndex,
    children,
  } as unknown as SelectionStatsLiveSlotProps<never>;
  return filled ? (
    <FeatureSlot slot={SELECTION_STATS_LIVE} props={statsProps} />
  ) : (
    children(null)
  );
}
