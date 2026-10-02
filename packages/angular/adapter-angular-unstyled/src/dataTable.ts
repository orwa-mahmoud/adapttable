/**
 * The unstyled Angular table: semantic HTML with `data-adapttable-part`
 * hooks and no styles of its own, over `@adapttable/angular`. Native HTML is
 * this kit's kit, so every control a reader uses is the browser's own.
 */
import {
  ACTIONS_COLUMN_KEY,
  ACTIVE_FILTER_CHIPS,
  type ActiveFilterChip,
  AdaptAttrs,
  AdaptCellTemplate,
  AdaptGridFocusAnnouncer,
  AdaptIcon,
  AdaptSlot,
  ADAPTTABLE_CONTEXT_MENU,
  ADAPTTABLE_FIND_STATE,
  ADAPTTABLE_PALETTE_OPEN,
  type AdaptTableFeature,
  AdaptTableStatusAnnouncer,
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  type AgentApprovalProps,
  asBatchGesture,
  type AssemblyFns,
  type Attrs,
  BATCH_EDIT_BAR,
  type BatchEditBarProps,
  type BatchEditHandler,
  bodyWindowKind,
  BULK_BAR,
  type BulkAction,
  type BulkBarSlotProps,
  type CellEditHandler,
  type CellNavigationChannelsOptions,
  type CellRange,
  type CellSaveStateInjectOptions,
  type CellSpanAppearance,
  cellSpanMark,
  type ChromeBodySlot,
  chromeFeatureNotices,
  chromeRenderModel,
  COLUMN_MENU,
  type ColumnDef,
  type ColumnInput,
  type ColumnLayoutState,
  type ColumnMenuSlotProps,
  COMMAND_PALETTE_LIVE,
  type CommandPaletteInjectOptions,
  type ConfirmHandler,
  CONTEXT_MENU_LIVE,
  type ContextMenuRegionHandlers,
  type ContextMenuTarget,
  copyContextMenuSelection,
  type DataTable,
  defaultConfirm,
  desktopBodySlots,
  desktopDetailMeasureRef,
  desktopRowMeasureRef,
  type DesktopRowWiringArgs,
  devWarn,
  type Direction,
  type DirtyEdits,
  dirtyMarkerView,
  editableCellController,
  type EditableCellEditing,
  type EditableCellSlotProps,
  type EditConflictHandler,
  type EditConflictPolicy,
  type EditEventHandler,
  type EditHistoryOptions,
  type EditValidationInjectOptions,
  estimateBodyItemSize,
  type ExpandToggleSlotProps,
  type ExportCsvOptions,
  type ExtraFilters,
  extraHostFillStyle,
  type ExtraRow,
  type FacetMap,
  featureOptionsOf,
  FILTER_DRAWER,
  FILTER_ENGINE_IMPL,
  FILTER_HEADER,
  FILTER_POPOVER,
  type FilterDef,
  FILTERS_FORM,
  FILTERS_ICON,
  type FilterTypeSpec,
  FIND_BAR,
  type FindBarProps,
  type FindInTableState,
  findMarkAttrs,
  flattenColumns,
  type GetCellSpan,
  type GridFocus,
  type GroupedFlatEntry,
  groupedViewSource,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  GROUPING_PANEL,
  type GroupingPanelSlotProps,
  injectBatchEditing,
  injectCellEditing,
  injectCellSaveState,
  injectColumnWindow,
  injectDataTable,
  injectDensity,
  injectDirtyCells,
  injectEditValidation,
  injectExportCsv,
  injectFindFocus,
  injectFindInTable,
  injectFindScroll,
  injectFindShortcut,
  injectFindWindowScroll,
  injectFullscreen,
  injectGridFocus,
  injectGrouping,
  injectGroupingPanelState,
  injectIsMobile,
  injectKeyedVirtualization,
  injectLiveEditConflict,
  injectMeasuredWindowScrollMargin,
  injectRowDetail,
  injectRowEditing,
  injectRowMutations,
  injectRowReorder,
  injectRowSelection,
  injectTableData,
  injectTableEditHistory,
  injectTableRowPinning,
  injectTableVirtualizer,
  injectTree,
  insertExtraRows,
  insertExtrasBeforeRows,
  type LiveEditConflictInput,
  type MobileCardRenderer,
  mountTableFeatures,
  type NestedTableParent,
  type PaginationMode,
  type PaletteOpenState,
  partitionPinnedRows,
  pinnedRowPart,
  type PinnedRows,
  pinnedRowSticky,
  pinnedSummaryPart,
  printToolbarProps,
  type QueryAggregate,
  type QuerySupport,
  renderedRowsOf,
  resolveBodyVirtualization,
  resolveEditingArming,
  resolveRowEditTrigger,
  resolveRowStyle,
  ROW_REORDER_ANNOUNCER,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  rowClickProps,
  type RowEditActionsProps,
  rowEditConflict,
  type RowEditHandler,
  type RowEditIcons,
  type RowHeight,
  rowIsDirty,
  type RowMutationsState,
  type RowReorderState,
  type RowSelection,
  type RowStyle,
  SAVED_VIEWS,
  type SavedViewsControllerOptions,
  type SavedViewsSlotProps,
  SEARCH_ICON,
  type SelectionState,
  selectionStatsOf,
  SIDE_PANEL,
  type SidePanelOptions,
  STATUS_BAR,
  type SummaryRowFn,
  TABLE_ASSISTANT,
  type TableAssistantProps,
  type TableContextMenuOptions,
  type TableDensity,
  tableFeaturesOf,
  type TableGrouping,
  type TableLabels,
  type TableQueryHandler,
  type TableQueryParams,
  type TableRowDetail,
  tableRuntimeFor,
  type TableSource,
  type TableTree,
  type TableVirtualization,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
  TREE_CELL,
  type TreeEntry,
  undoRedoToolbarProps,
  urlAdapterFor,
  virtualizeIgnoredOnPage,
  windowGroupedEntries,
  withRowMutationActions,
  withRowPinActions,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  type ElementRef,
  inject,
  Injector,
  input,
  type OnInit,
  output,
  type Signal,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { AdaptDesktopTable } from "./components/desktopTable";
import { AdaptErrorState } from "./components/errorState";
import { AdaptMobileCards } from "./components/mobileCards";
import { AdaptPaginationFooter } from "./components/paginationFooter";
import { AdaptTableRegion } from "./components/tableRegion";
import { AdaptTableSkeleton } from "./components/tableSkeleton";
import {
  type FiltersMode,
  type FiltersView,
  filtersViewFor,
} from "./tableFilters";
import type { DataTableClassNames } from "./types";

/** Mount optional behavior over the same reactive channels the kit renders. */
function mountLiveFeatures<TRow>(options: {
  readonly table: DataTable<TRow>;
  readonly source: Signal<TableSource<TRow>>;
  readonly features: readonly AdaptTableFeature[];
  readonly filters: ReturnType<typeof injectTableData<TRow>>["runtime"];
  readonly grouping: Signal<TableGrouping<TRow> | undefined> | undefined;
  readonly tree: Signal<TableTree<TRow> | undefined> | undefined;
  readonly pinning: ReturnType<typeof injectTableRowPinning<TRow>>;
  readonly selection: RowSelection | undefined;
  readonly editing: Signal<EditableCellEditing<TRow>> | undefined;
  readonly rowActions: readonly RowAction<TRow>[] | undefined;
  readonly bulkActions: readonly BulkAction[] | undefined;
  readonly injector: Injector;
}): void {
  if (!options.features.some((feature) => feature.mount !== undefined)) return;
  const columnLayoutLive = options.features.some((feature) =>
    [
      "column-menu",
      "resizable-columns",
      "collapsible-column-groups",
      "context-menu",
      "saved-views",
      "fit-columns",
    ].includes(feature.id ?? "")
  );
  const runtime = tableRuntimeFor(
    options.table,
    options.source,
    options.features,
    options.grouping,
    computed(() => ({
      filterDefs: options.filters().defs,
      filterRegistry: options.filters().registry,
      columnLayoutLive,
      selection: options.selection?.state(),
      tree: options.tree?.(),
      rowPinning: options.pinning?.(),
      editing: options.editing?.(),
      rowActions: options.rowActions,
      bulkActions: options.bulkActions,
    }))
  );
  mountTableFeatures(options.features, {
    runtime,
    state: options.table.featureState,
    injector: options.injector,
  });
}

/** Read an opt-in history from the feature configuration. */
function historyFor<TRow>(
  featureOptions: Readonly<Record<string, unknown>>,
  columns: Signal<readonly ColumnDef<TRow>[]>,
  injector: Injector
): ReturnType<typeof injectTableEditHistory<TRow>> | undefined {
  if (
    featureOptions.editHistory === undefined ||
    featureOptions.editHistory === false
  )
    return undefined;
  return injectTableEditHistory<TRow>(
    computed(() => ({
      editHistory: featureOptions.editHistory as boolean | EditHistoryOptions,
      columns: columns(),
      onCellEdit: featureOptions.onCellEdit as
        CellEditHandler<TRow> | undefined,
    })),
    injector
  );
}

/** Record inline and batch writes as their respective core gestures. */
function editingOptionsFor<TRow>(
  featureOptions: Readonly<Record<string, unknown>>,
  history: ReturnType<typeof injectTableEditHistory<TRow>> | undefined
): Readonly<Record<string, unknown>> {
  if (!history) return featureOptions;
  return {
    ...featureOptions,
    onCellEdit: history().onCellEdit,
    onBatchEdit: asBatchGesture(
      featureOptions.onBatchEdit as BatchEditHandler<TRow> | undefined,
      history().history.record
    ),
  };
}

/**
 * The editing bundle for composed editing features, or absent.
 */
function editingBundleFor<TRow>(options: {
  readonly live: Signal<LiveEditConflictInput<TRow>>;
  readonly featureOptions: Readonly<Record<string, unknown>>;
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  readonly featureHost: DataTable<TRow>["featureHost"];
  readonly labels: DataTable<TRow>["labels"];
  readonly injector: Injector;
}): Signal<EditableCellEditing<TRow>> | undefined {
  const armed = resolveEditingArming(options.featureOptions);
  if (!armed.any) return undefined;
  const onCellEdit = options.featureOptions.onCellEdit as
    CellEditHandler<TRow> | undefined;
  const onRowEdit = options.featureOptions.onRowEdit as
    RowEditHandler<TRow> | undefined;
  const onBatchEdit = options.featureOptions.onBatchEdit as
    BatchEditHandler<TRow> | undefined;
  const onEditStart = options.featureOptions.onEditStart as
    EditEventHandler<TRow> | undefined;
  const onEditCancel = options.featureOptions.onEditCancel as
    EditEventHandler<TRow> | undefined;
  const onEditCommit = options.featureOptions.onEditCommit as
    EditEventHandler<TRow> | undefined;
  const cellState = injectCellEditing<TRow>({
    onEditStart,
    onEditCancel,
    onEditCommit,
    injector: options.injector,
  });
  const validation = injectEditValidation<TRow>({
    validateRow: options.featureOptions
      .validateRow as EditValidationInjectOptions<TRow>["validateRow"],
    applyEdit: options.featureOptions
      .applyEdit as EditValidationInjectOptions<TRow>["applyEdit"],
    injector: options.injector,
  });
  const saving = injectCellSaveState<TRow>({
    onRollback: options.featureOptions
      .onEditRollback as CellSaveStateInjectOptions<TRow>["onRollback"],
    formatError: options.featureOptions
      .formatEditError as CellSaveStateInjectOptions<TRow>["formatError"],
    onEditError: options.featureOptions.onEditError as
      EditEventHandler<TRow> | undefined,
    injector: options.injector,
  });
  const tracked = injectDirtyCells({
    enabled: armed.trackDirty,
    onDirtyChange: options.featureOptions.onDirtyChange as
      ((dirty: DirtyEdits) => void) | undefined,
    injector: options.injector,
  });
  const rowEditIcons = options.featureOptions.rowEditIcons as
    RowEditIcons | undefined;
  const lifecycle = {
    onEditStart,
    onEditCancel,
    onEditCommit,
    onValidationFail: options.featureOptions.onValidationFail as
      EditEventHandler<TRow> | undefined,
  };
  const rowEditing = armed.row
    ? injectRowEditing<TRow>({
        enabled: true,
        columns: options.columns,
        onRowEdit,
        onEditStart,
        onEditCancel,
        onEditCommit,
        featureHost: options.featureHost,
        injector: options.injector,
      })
    : undefined;
  const batch = armed.batch
    ? injectBatchEditing<TRow>({
        enabled: true,
        columns: options.columns,
        onBatchEdit,
        onEditStart,
        onEditCancel,
        onEditCommit,
        featureHost: options.featureHost,
        injector: options.injector,
      })
    : undefined;
  const conflict = injectLiveEditConflict({
    input: options.live,
    cell: cellState,
    row: rowEditing,
    batch,
    injector: options.injector,
  });
  return computed((): EditableCellEditing<TRow> => {
    const labels = options.labels();
    return {
      onCellEdit,
      state: cellState(),
      validation: validation(),
      saving: saving(),
      dirty: dirtyMarkerView(tracked(), armed.dirtyMarkers),
      rowEditing: rowEditing?.(),
      rowEditIcons,
      batch: batch?.(),
      lifecycle,
      conflict: conflict(),
      conflictLabels: {
        message: labels.editConflict,
        keepMine: labels.keepMine,
        takeTheirs: labels.takeTheirs,
        theirsValue: labels.theirsValue,
      },
      featureHost: options.featureHost,
    };
  });
}

/**
 * One row's actions cell: row editing's controls and the host's actions.
 *
 * @public
 */
export interface RowActionsCell<TRow> {
  /** The row-edit controls' props, when row editing is composed. */
  readonly rowEdit: RowEditActionsProps<never> | undefined;
  /** The host's actions, less any whose trigger row editing now owns. */
  readonly actions: readonly RowAction<TRow>[];
}

/**
 * One data row the body draws: the row, its index in the page, its id, and
 * the attributes its row or card carries.
 *
 * @public
 */
export interface BodyRow<TRow> extends DesktopRowWiringArgs<TRow> {
  /**
   * The row's attributes — the grid's or the table's, plus the window's
   * measure ref while virtualized.
   */
  readonly rowAttrs: Attrs;
  /** The same row as a phone card: its attributes, measured the same way. */
  readonly cardAttrs: Attrs;
  /**
   * The row's detail row's attributes: the window's measure ref, so a row
   * and its open detail count as one virtual item.
   */
  readonly detailAttrs: Attrs;
}

/**
 * One drawn body cell: its column, where focus addresses it, and how far it
 * spans.
 *
 * @public
 */
export interface BodyCellView<TRow> {
  /** The column. */
  readonly column: ColumnDef<TRow>;
  /** Its index among the visible columns — what focus addresses. */
  readonly columnIndex: number;
  /** Columns the cell covers. */
  readonly colSpan: number;
  /** Rows the cell covers. */
  readonly rowSpan: number;
  /** `data-cell-span`, e.g. `"1x2"`, on a merged cell. */
  readonly mark: string | undefined;
}

/**
 * One slot of the body in reading order: a group header, footer or "show
 * more" row, a data row, a host extra row, or a virtual spacer.
 *
 * @public
 */
export type BodySlot<TRow> = ChromeBodySlot<TRow, BodyRow<TRow>>;

/**
 * The group header slots' props — {@link GROUP_HEADER_ROW} on desktop and
 * {@link GROUP_HEADER_CARD} on phones — keyed by entry key.
 */
function groupHeadersFor<TRow>(options: {
  readonly table: DataTable<TRow>;
  readonly grouping: Signal<TableGrouping<TRow> | undefined>;
  readonly slots: Signal<readonly BodySlot<TRow>[]>;
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  readonly selection: RowSelection | undefined;
  readonly leadingCells: Signal<number>;
  readonly showActions: Signal<boolean>;
}): Signal<{
  readonly rows: ReadonlyMap<string, GroupHeaderRowSlotProps<never>>;
  readonly cards: ReadonlyMap<string, GroupHeaderCardSlotProps<never>>;
}> {
  const { table } = options;
  const getCellProps = (column: ColumnDef<TRow>) => table.cellAttrs(column);
  return computed(() => {
    const grouping = options.grouping();
    const rows = new Map<string, GroupHeaderRowSlotProps<never>>();
    const cards = new Map<string, GroupHeaderCardSlotProps<never>>();
    if (!grouping) return { rows, cards };
    const columns = options.columns();
    const labels = table.labels();
    const selection = options.selection?.state() ?? null;
    const onToggleCollapse = (groupKey: string): void => {
      grouping.collapsed.toggle(groupKey);
    };
    for (const slot of options.slots()) {
      if (slot.kind !== "group") continue;
      const shared = {
        entry: slot.entry,
        columns,
        selection,
        labels,
        onToggleCollapse,
        onShowMore: grouping.showMore,
      };
      rows.set(slot.key, {
        ...shared,
        leadingCells: options.leadingCells(),
        showActions: options.showActions(),
        getCellProps,
      } as unknown as GroupHeaderRowSlotProps<never>);
      cards.set(slot.key, {
        ...shared,
        compact: false,
      } as unknown as GroupHeaderCardSlotProps<never>);
    }
    return { rows, cards };
  });
}

/**
 * The {@link EDITABLE_CELL} props of every cell in the body window, keyed
 * `rowId:columnKey`. A computed map keeps each object the same between
 * change-detection passes, so a slot's props change only when editing,
 * the rows or the columns do.
 */
function editableCellsFor<TRow>(options: {
  readonly table: DataTable<TRow>;
  readonly editing: Signal<EditableCellEditing<TRow>>;
  readonly rows: Signal<readonly BodyRow<TRow>[]>;
  readonly rowKey: Signal<(row: TRow) => string>;
}): Signal<ReadonlyMap<string, EditableCellSlotProps<never>>> {
  return computed(() => {
    const { table } = options;
    const editing = options.editing();
    const labels = table.labels();
    const rows = table.rows();
    const columns = table.columns();
    const rowKey = options.rowKey();
    const cells = new Map<string, EditableCellSlotProps<never>>();
    for (const entry of options.rows()) {
      const rowId = rowKey(entry.row);
      for (const column of columns) {
        const props = {
          editing,
          row: entry.row,
          column,
          rowId,
          rowIndex: entry.index,
          rows,
          columns,
          rowKey,
          editLabel: labels.editCell,
          undoLabel: labels.undoEdit,
        };
        cells.set(
          `${rowId}:${column.key}`,
          props as unknown as EditableCellSlotProps<never>
        );
      }
    }
    return cells;
  });
}

/**
 * Every window row's actions cell, keyed by row id: the row-edit controls
 * and the host's actions, with a host action that opens the row taking the
 * begin control's place.
 */
function actionsCellsFor<TRow>(options: {
  readonly table: DataTable<TRow>;
  readonly editing: Signal<EditableCellEditing<TRow>> | undefined;
  readonly rowActions: Signal<RowAction<TRow>[] | undefined>;
  readonly rows: Signal<readonly BodyRow<TRow>[]>;
  readonly rowKey: Signal<(row: TRow) => string>;
}): Signal<ReadonlyMap<string, RowActionsCell<TRow>>> {
  return computed(() => {
    const editing = options.editing?.();
    const rowEditing = editing?.rowEditing;
    const actions = options.rowActions();
    const labels = options.table.labels();
    const rowKey = options.rowKey();
    const cells = new Map<string, RowActionsCell<TRow>>();
    for (const entry of options.rows()) {
      const rowId = rowKey(entry.row);
      const trigger = resolveRowEditTrigger(
        actions,
        rowEditing,
        entry.row,
        rowId
      );
      const rowEdit: RowEditActionsProps<TRow> | undefined = rowEditing && {
        rowEditing,
        row: entry.row,
        rowId,
        showBegin: trigger.showBegin,
        icons: editing.rowEditIcons,
        conflict: rowEditConflict(editing, rowId),
        labels,
      };
      cells.set(rowId, {
        rowEdit: rowEdit as unknown as RowEditActionsProps<never> | undefined,
        actions: trigger.actions,
      });
    }
    return cells;
  });
}

/** A number feature option, or nothing when it is not a number. */
function numberOption(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** The live find state, when the feature is composed. */
function findStateFor<TRow>(options: {
  readonly enabled: boolean;
  readonly table: DataTable<TRow>;
  readonly urlAdapter: ReturnType<typeof urlAdapterFor>;
  readonly urlSync: boolean;
  readonly urlKey: string | undefined;
  readonly injector: Injector;
}): Signal<FindInTableState> | undefined {
  if (!options.enabled) return undefined;
  const { table } = options;
  return injectFindInTable<TRow>({
    rows: computed(() => table.source().rows),
    columns: table.columns,
    firstRowIndex: computed(() => table.windowStart()),
    urlAdapter: options.urlAdapter,
    urlSync: options.urlSync,
    urlKey: options.urlKey,
    injector: options.injector,
  });
}

/** Shortcut, scroll and grid focus for a composed find bar. */
function wireFindChrome<TRow>(options: {
  readonly find: Signal<FindInTableState> | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly root: () => HTMLElement | null;
  readonly injector: Injector;
}): void {
  const { find, grid, injector } = options;
  if (!find) return;
  const current = computed(() => find().current);
  injectFindShortcut({
    root: options.root,
    openBar: computed(() => find().openBar),
    injector,
  });
  injectFindScroll({
    root: options.root,
    current,
    enabled: computed(() => grid === undefined),
    injector,
  });
  if (!grid) return;
  injectFindFocus({
    find,
    focusCell: grid.focusCell,
    selectRange: grid.selectRange,
    enabled: grid.enabled,
    injector,
  });
}

/** Ask a flat virtual window to render the current match. */
function scrollFindWindow<TRow>(options: {
  readonly find: Signal<FindInTableState> | undefined;
  readonly rows: Signal<readonly TRow[]>;
  readonly firstRowIndex: Signal<number>;
  readonly scrollToIndex: () => ((index: number) => void) | undefined;
  readonly injector: Injector;
}): void {
  const { find } = options;
  if (!find) return;
  injectFindWindowScroll({
    current: computed(() => find().current),
    rows: options.rows,
    firstRowIndex: options.firstRowIndex,
    scrollToIndex: options.scrollToIndex,
    injector: options.injector,
  });
}

/** Copy or cut the cell the menu was opened on, once cell navigation is on. */
function menuCopy<TRow>(
  grid: GridFocus<TRow> | undefined,
  target: ContextMenuTarget<TRow>,
  cut?: boolean
): void {
  if (!grid) return;
  copyContextMenuSelection(
    { range: grid.range(), cellAt: grid.cellAt, copyCells: grid.copyCells },
    target,
    cut
  );
}

/** The menu slot's props, including the handlers the built-in entries call. */
function mountedContextMenu<TRow>(input: {
  readonly contextMenu: TableContextMenuOptions<TRow>["contextMenu"];
  readonly table: DataTable<TRow>;
  readonly pinning:
    | Signal<{ readonly actions: readonly RowAction<TRow>[] } | undefined>
    | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly filters: FiltersView | undefined;
  readonly rowKey: (row: TRow) => string;
  readonly onCellCut: Signal<((range: CellRange) => void) | undefined>;
}): Signal<
  TableContextMenuOptions<TRow> & {
    readonly children: (regionProps: Record<string, unknown>) => undefined;
  }
> {
  const { table, grid, filters } = input;
  const options = contextMenuOptionsFor({
    contextMenu: input.contextMenu,
    columns: table.columns,
    labels: table.labels,
    rowFor: (rowId) =>
      table.source().rows.find((row) => input.rowKey(row) === rowId),
    sortBy: table.sortBy,
    sortDir: table.sortDir,
    isPinned: (columnKey) =>
      table.layout().state.pinned[columnKey] !== undefined,
    rowPins: computed(() => input.pinning?.()?.actions ?? []),
    featureHost: table.featureHost,
    gridNavigation: grid !== undefined,
    onSort: (columnKey, direction) => {
      table.source().setSort(columnKey, direction);
    },
    onHide: (columnKey) => {
      table.layout().toggleVisible(columnKey);
    },
    onFilter: filters ? () => filters.show() : undefined,
    onCopy: (target) => menuCopy(grid, target),
    cut: computed(() => grid !== undefined && input.onCellCut() !== undefined),
    onCut: (target) => menuCopy(grid, target, true),
  });
  // The slot type requires `children` for the React root wrapper. Angular
  // binds the region handlers on the table root instead.
  return computed(() => ({ ...options(), children: () => undefined }));
}

/** Props for the context-menu slot, whether or not a feature fills it. */
function contextMenuOptionsFor<TRow>(options: {
  readonly contextMenu: TableContextMenuOptions<TRow>["contextMenu"];
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  readonly labels: Signal<TableLabels>;
  readonly rowFor: (rowId: string) => TRow | undefined;
  readonly sortBy: Signal<string | undefined>;
  readonly sortDir: Signal<"asc" | "desc" | undefined>;
  readonly isPinned: (columnKey: string) => boolean;
  readonly rowPins: Signal<readonly RowAction<TRow>[]>;
  readonly featureHost: TableContextMenuOptions<TRow>["featureHost"];
  readonly gridNavigation: boolean;
  readonly onSort: (columnKey: string, direction: "asc" | "desc") => void;
  readonly onHide: (columnKey: string) => void;
  readonly onFilter: (() => void) | undefined;
  readonly onCopy: (target: ContextMenuTarget<TRow>) => void;
  readonly cut: Signal<boolean>;
  readonly onCut: (target: ContextMenuTarget<TRow>) => void;
}): Signal<TableContextMenuOptions<TRow>> {
  return computed(() => ({
    contextMenu: options.contextMenu,
    columns: options.columns(),
    labels: options.labels(),
    rowFor: options.rowFor,
    actions: {
      onCopy: options.onCopy,
      onCut: options.cut() ? options.onCut : undefined,
      onSort: options.onSort,
      onHide: options.onHide,
      onFilter: options.onFilter,
    },
    sortBy: options.sortBy(),
    sortDir: options.sortDir(),
    isPinned: options.isPinned,
    rowPins: options.rowPins(),
    featureHost: options.featureHost,
    gridNavigation: options.gridNavigation,
  }));
}

/** Props for the command-palette slot, whether or not a feature fills it. */
function commandPalettePropsFor(options: {
  readonly commandPalette: CommandPaletteInjectOptions["commandPalette"];
  readonly onPrint: CommandPaletteInjectOptions["onPrint"];
  readonly labels: Signal<TableLabels>;
  readonly clearFilters: () => void;
  readonly featureHost: CommandPaletteInjectOptions["featureHost"];
  readonly exportCsv:
    | Signal<
        | {
            readonly onExportCsv?: () => void;
            readonly exportLabel?: string;
          }
        | undefined
      >
    | undefined;
  readonly filterCount: Signal<number>;
}): Signal<CommandPaletteInjectOptions> {
  return computed(() => {
    const exported = options.exportCsv?.();
    return {
      commandPalette: options.commandPalette,
      labels: options.labels(),
      onPrint: options.onPrint,
      onExport: exported?.onExportCsv,
      exportLabel: exported?.exportLabel,
      onClearFilters: options.clearFilters,
      hasFilters: options.filterCount() > 0,
      featureHost: options.featureHost,
    };
  });
}

/** The find bar's slot props, while find is composed. */
function findBarFor(
  find: Signal<FindInTableState> | undefined,
  labels: Signal<TableLabels>
): Signal<FindBarProps> | undefined {
  if (!find) return undefined;
  return computed(() => ({ find: find(), labels: labels() }));
}

/** Cell attributes, with find marks when the grid is not painting them. */
function cellAttrsWithFind<TRow>(
  table: DataTable<TRow>,
  grid: GridFocus<TRow> | undefined,
  find: Signal<FindInTableState> | undefined
): (column: ColumnDef<TRow>, index: number, col: number) => Attrs {
  return (column, index, col) => {
    if (grid) return grid.cellAttrs(column, index, col);
    const base = table.cellAttrs(column);
    const state = find?.();
    if (!state?.open) return base;
    return findMarkAttrs(base, state, {
      row: table.windowStart() + index,
      col,
    });
  };
}

/**
 * The window the body draws: the flat rows (or a keyed window's spacers)
 * and, while grouping renders, the grouped entries in view.
 */
interface BodyWindow<TRow> {
  /** The row window — every row when virtualization is off. */
  readonly virtualization: TableVirtualization<TRow>;
  /**
   * Scroll the flat virtual window to a loaded-row index. Absent when the
   * body is not a flat virtual list.
   */
  readonly scrollToRowIndex?: (index: number) => void;
  /** The grouped entries in the window, while grouping renders. */
  readonly groupingEntries: readonly GroupedFlatEntry<TRow>[] | undefined;
  /** The tree entries in the window, while the rows are a tree. */
  readonly treeEntries: readonly TreeEntry<TRow>[] | undefined;
}

/**
 * The body window for a composed {@link virtualize} feature, or every row
 * and entry when the feature is absent. A grouped body windows over its
 * entries — headers, footers and leaves — and a tree over its open nodes,
 * rather than over the rows.
 */
function bodyWindowFor<TRow>(options: {
  readonly table: DataTable<TRow>;
  readonly grouping: Signal<TableGrouping<TRow> | undefined> | undefined;
  readonly tree: Signal<TableTree<TRow> | undefined> | undefined;
  readonly expandable: boolean;
  /** The rows that scroll — every row but the pinned ones. */
  readonly scrollRows: Signal<readonly TRow[]>;
  readonly featureOptions: Readonly<Record<string, unknown>>;
  readonly rowKey: (row: TRow) => string;
  readonly maxHeight: number | string | undefined;
  readonly scrollBox: () => HTMLElement | null;
  readonly root: () => HTMLElement | null;
  readonly injector: Injector;
}): Signal<BodyWindow<TRow>> {
  const {
    table,
    grouping,
    tree,
    expandable,
    scrollRows,
    featureOptions,
    rowKey,
    maxHeight,
    scrollBox,
    root,
    injector,
  } = options;
  const source = table.source;
  const wantVirtualize = featureOptions.virtualize === true;
  const groupEntries = computed(() => grouping?.()?.entries);
  const treeEntries = computed(() => tree?.()?.entries);
  const bodyChrome = computed(() => {
    const entries = groupEntries();
    const nodes = treeEntries();
    return {
      body: table.bodyRegion(),
      isPaged: source().paginationMode === "paged",
      source: source(),
      grouping: entries === undefined ? undefined : { entries },
      tree: nodes === undefined ? undefined : { entries: nodes },
      isMobile: table.isMobile(),
    };
  });
  if (wantVirtualize && virtualizeIgnoredOnPage(true, bodyChrome())) {
    devWarn(
      'virtualize only applies in infinite mode — this paged table renders unvirtualized. Pass paginationMode="infinite" to enable it, or group the rows: an expanded page is windowed.'
    );
  }
  if (!wantVirtualize) {
    return computed(() => ({
      virtualization: {
        enabled: false,
        rows: scrollRows().map((row, index) => ({
          row,
          index,
          key: rowKey(row),
        })),
        paddingTop: 0,
        paddingBottom: 0,
      },
      scrollToRowIndex: undefined,
      groupingEntries: groupEntries(),
      treeEntries: treeEntries(),
    }));
  }
  const sizes = {
    estimateRowSize: numberOption(featureOptions.estimateRowSize),
    estimateCardSize: numberOption(featureOptions.estimateCardSize),
    rowHeight: featureOptions.rowHeight as RowHeight<TRow> | undefined,
  };
  const estimateSize = computed(() =>
    estimateBodyItemSize(bodyChrome(), sizes, scrollRows())
  );
  const overscan = numberOption(featureOptions.virtualOverscan);
  const hostMargin = numberOption(featureOptions.virtualScrollMargin);
  const inScrollBox = maxHeight != null;
  // Scrolling the page, a list that starts down the page windows from where
  // it starts; the host's margin wins when it gave one.
  const measuredMargin = injectMeasuredWindowScrollMargin({
    enabled: !inScrollBox && hostMargin === undefined,
    element: root,
    injector,
  });
  const scrollMargin = computed(() => hostMargin ?? measuredMargin());
  const getScrollElement = inScrollBox ? () => scrollBox() : undefined;
  const onEndReached = (): void => {
    table.loadMore();
  };
  const kind = computed(() => bodyWindowKind(true, bodyChrome()));
  const flat = injectTableVirtualizer<TRow>({
    rows: scrollRows,
    rowKey,
    enabled: computed(() => kind() === "flat"),
    expandable,
    estimateSize,
    overscan,
    scrollMargin,
    getScrollElement,
    onEndReached,
    injector,
  });
  const keyed = injectKeyedVirtualization({
    keys: computed(() =>
      (kind() === "tree" ? (treeEntries() ?? []) : (groupEntries() ?? [])).map(
        (entry) => entry.key
      )
    ),
    enabled: computed(() => kind() === "grouped" || kind() === "tree"),
    estimateSize,
    overscan,
    scrollMargin,
    getScrollElement,
    onEndReached,
    injector,
  });
  return computed(() => {
    const entries = groupEntries();
    const nodes = treeEntries();
    const window = keyed();
    return {
      virtualization: resolveBodyVirtualization(window, flat.virtualization()),
      scrollToRowIndex: kind() === "flat" ? flat.scrollToIndex : undefined,
      groupingEntries:
        entries === undefined
          ? undefined
          : windowGroupedEntries(entries, window.indices),
      treeEntries:
        nodes === undefined
          ? undefined
          : windowGroupedEntries(nodes, window.indices),
    };
  });
}

/**
 * What the table renders from once its inputs have arrived.
 *
 * @public
 */
export interface TableView<TRow> {
  /** The headless table. */
  readonly table: DataTable<TRow>;
  /** Live class hooks for the mobile and row-action parts. */
  readonly classNames: Signal<DataTableClassNames>;
  /** A host template or component replacing only the card's field layout. */
  readonly renderCard: Signal<MobileCardRenderer<TRow> | undefined>;
  /** A host template or component replacing the resolved row actions. */
  readonly renderRowActions: Signal<RowActionsRenderer<TRow> | undefined>;
  /** The host's live changed-cell marks, shared by cells and card values. */
  readonly isCellFlashing: (rowId: string, columnKey: string) => boolean;
  /** Row selection, when the table is selectable. */
  readonly selection: RowSelection | undefined;
  /** Cell navigation, when it is on. */
  readonly grid: GridFocus<TRow> | undefined;
  /** The find bar's props, when `findInTable()` is composed. */
  readonly findBar: Signal<FindBarProps> | undefined;
  /** Props for the command-palette slot. Empty when the feature is absent. */
  readonly commandPalette: Signal<CommandPaletteInjectOptions>;
  /** Props for the context-menu slot. Empty when the feature is absent. */
  readonly contextMenu: Signal<
    TableContextMenuOptions<TRow> & {
      readonly children: (regionProps: Record<string, unknown>) => undefined;
    }
  >;
  /**
   * A cell's attributes, with find's match marks when the grid is not
   * painting them itself.
   */
  readonly markedCellAttrs: (
    column: ColumnDef<TRow>,
    index: number,
    col: number,
    rowId?: string
  ) => Attrs;
  /** Whether the Columns menu is composed. */
  readonly columnMenu: boolean;
  /** The Columns menu's props. */
  readonly columnMenuProps: Signal<ColumnMenuSlotProps<never>>;
  /** The filters, when a filters feature is composed. */
  readonly filters: FiltersView | undefined;
  /** The selection bar's props, when bulk actions are composed. */
  readonly bulkBar: Signal<BulkBarSlotProps<SelectionState>> | undefined;
  /** The actions column's list, absent while hidden or empty. */
  readonly rowActions: Signal<RowAction<TRow>[] | undefined>;
  /** A strip of buttons, or a menu. */
  readonly rowActionsLayout: RowActionsLayout | undefined;
  /** Host-owned row additions and mutations. */
  readonly rowMutations: Signal<RowMutationsState<TRow>>;
  /** Asks before an action that declares a `confirm`. */
  readonly confirm: ConfirmHandler;
  /** The row density the root states. */
  readonly density: Signal<TableDensity>;
  /** The toolbar extras' props: density, fullscreen and export. */
  readonly toolbarExtras: Signal<ToolbarExtrasSlotProps>;
  /** The saved-views menu's props, when it is composed. */
  readonly savedViews:
    Signal<SavedViewsSlotProps<SavedViewsControllerOptions>> | undefined;
  /** The grouping strip's props, when the panel feature is composed. */
  readonly groupingPanel:
    Signal<GroupingPanelSlotProps<ColumnDef<TRow>>> | undefined;
  /** Row reorder state, when the feature is composed. */
  readonly reorder: Signal<RowReorderState<TRow>> | undefined;
  /** The live tree, when `tree()` is composed. */
  readonly tree: Signal<TableTree<TRow> | undefined> | undefined;
  /** Whether a kit draws the tree column's cell. */
  readonly treeCellFilled: boolean;
  /** Whether each column header carries a column-selection checkbox. */
  readonly columnSelect: boolean;
  /** The live row detail, when `rowDetail()` or `nestedTable()` is composed. */
  readonly rowDetail: Signal<TableRowDetail<TRow>> | undefined;
  /** Each window row's expand toggle props, keyed by row id. */
  readonly expandToggles: Signal<ReadonlyMap<string, ExpandToggleSlotProps>>;
  /** Each drawn row's cells, spans applied, keyed by row id. */
  readonly bodyCells: Signal<
    ReadonlyMap<string, readonly BodyCellView<TRow>[]>
  >;
  /** How a merged cell looks: `"merged"` (default) or `"plain"`. */
  readonly cellSpanAppearance: CellSpanAppearance | undefined;
  /** What this table hands the tables nested under its rows. */
  readonly detailParent: Signal<NestedTableParent>;
  /** The summary row's value per column, when `summaryRow` is given. */
  readonly summary: Signal<Partial<Record<string, unknown>> | undefined>;
  /** Whether the summary row draws: a `summaryRow`, or a column footer. */
  readonly showSummary: Signal<boolean>;
  /**
   * Cell editing bundle, when an editing feature is composed — state, channel,
   * validation, save tracking and lifecycle observers for the gate.
   */
  readonly editing: Signal<EditableCellEditing<TRow>> | undefined;
  /** Each window cell's editable-cell props, when editing is composed. */
  readonly editableCells:
    Signal<ReadonlyMap<string, EditableCellSlotProps<never>>> | undefined;
  /**
   * Whether the actions column is drawn — row actions, or row editing's
   * begin/save/cancel controls.
   */
  readonly showActions: Signal<boolean>;
  /** Each window row's actions cell, keyed by row id. */
  readonly actionsCells: Signal<ReadonlyMap<string, RowActionsCell<TRow>>>;
  /** The batch-edit bar's props, when batch editing is composed. */
  readonly batchBar: Signal<BatchEditBarProps<TRow> | undefined> | undefined;
  /** The grouped model, while `grouping()` or `groupingPanel()` is composed. */
  readonly grouping: Signal<TableGrouping<TRow> | undefined> | undefined;
  /** The body window — every row when virtualization is off. */
  readonly virtualization: Signal<TableVirtualization<TRow>>;
  /** The body in reading order, from core's body layout. */
  readonly body: Signal<readonly BodySlot<TRow>[]>;
  /** The group header, footer and "show more" slots' props, by entry key. */
  readonly groupHeaders: Signal<{
    readonly rows: ReadonlyMap<string, GroupHeaderRowSlotProps<never>>;
    readonly cards: ReadonlyMap<string, GroupHeaderCardSlotProps<never>>;
  }>;
  /** Column span for spacer/detail cells. */
  readonly bodyColSpan: Signal<number>;
  /** The columns the desktop table draws — a window of them when wide. */
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  /** The spacer widths either side of a column window, when windowed. */
  readonly columnSpacers: Signal<{ start: number; end: number } | undefined>;
  /** Each column's position among all visible columns, by key. */
  readonly columnIndex: Signal<ReadonlyMap<string, number>>;
}

/**
 * The unstyled AdaptTable for Angular: search, sorting, paging, the phone
 * card layout, row selection and keyboard cell navigation, drawn with native
 * elements that carry the `data-adapttable-part` names every kit shares.
 *
 * @public
 */
@Component({
  selector: "adapt-data-table",
  imports: [
    NgTemplateOutlet,
    AdaptAttrs,
    AdaptDesktopTable,
    AdaptIcon,
    AdaptErrorState,
    AdaptGridFocusAnnouncer,
    AdaptMobileCards,
    AdaptPaginationFooter,
    AdaptSlot,
    AdaptTableRegion,
    AdaptTableSkeleton,
    AdaptTableStatusAnnouncer,
  ],
  templateUrl: "./dataTable.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ADAPTTABLE_FIND_STATE,
      useFactory: () => signal<FindInTableState | null>(null),
    },
    {
      provide: ADAPTTABLE_PALETTE_OPEN,
      useFactory: () => signal<PaletteOpenState | null>(null),
    },
    {
      provide: ADAPTTABLE_CONTEXT_MENU,
      useFactory: () => signal<ContextMenuRegionHandlers | null>(null),
    },
  ],
})
export class AdaptDataTable<TRow> implements OnInit {
  /**
   * The rows: every row for a table that searches, sorts and pages them
   * itself, or the current page when `onQueryChange` fetches it. The host
   * owns the array.
   */
  readonly data = input<readonly TRow[]>();
  /**
   * A prebuilt source — `injectQuerySource`'s, or any `TableSource` — in
   * place of `data`. Read once.
   */
  readonly source = input<Signal<TableSource<TRow>> | TableSource<TRow>>();
  /**
   * `"server"` makes `onQueryChange` fetch the rows; `"frontend"` keeps the
   * table's own processing and makes `onQueryChange` a notification. Absent:
   * `data` with `onQueryChange` is server, `data` alone is frontend.
   */
  readonly mode = input<"frontend" | "server">();
  /**
   * Called with one consolidated query per real change: on the server tier
   * the host fetches that page and the superseded request's `signal` is
   * aborted; on the frontend tier it is told what the reader did.
   */
  readonly onQueryChange = input<TableQueryHandler>();
  /** Server tier: the row count across every page. */
  readonly total = input<number>();
  /** A request in flight. */
  readonly loading = input<boolean>();
  /** A failure to show. */
  readonly error = input<Error | null>();
  /** Server tier: what the endpoint can answer beyond the baseline query. */
  readonly supports = input<QuerySupport>();
  /** Server tier: aggregates to ask the endpoint for. */
  readonly aggregates = input<readonly QueryAggregate[]>();
  /** Server tier: the `key` of the query the current `data` answers. */
  readonly responseKey = input<string>();
  /** Server tier: distinct-value counts from the last fetch. */
  readonly facets = input<FacetMap>();
  /** Server tier: filter keys to count; defaults to every checklist filter. */
  readonly facetKeys = input<readonly string[]>();
  /** The columns in order, and header groups over them. */
  readonly columns = input.required<readonly ColumnInput<TRow>[]>();
  /** A row's stable id. */
  readonly rowKey = input.required<(row: TRow) => string>();
  /** The table's accessible name. Defaults to the `table` label. */
  readonly tableLabel = input<string>();
  /** Text direction. */
  readonly dir = input<Direction>("ltr");
  /** Show the phone layout whatever the viewport. */
  readonly forceMobile = input<boolean>();
  /** Classes for mobile-card and row-action parts. */
  readonly classNames = input<DataTableClassNames>({});
  /** Replace a card's fields while preserving its interactive shell. */
  readonly renderCard = input<MobileCardRenderer<TRow>>();
  /** Replace row actions on desktop and cards with a template or component. */
  readonly renderRowActions = input<RowActionsRenderer<TRow>>();
  /** Activate a row by clicking its body, Enter or Space. */
  readonly onRowClick = input<(row: TRow) => void>();
  /** Live changed-cell reader, such as `injectChangedCellFlash().isFlashing`. */
  readonly isCellFlashing =
    input<(rowId: string, columnKey: string) => boolean>();
  /** Translated labels, merged over the English defaults. */
  readonly labels = input<TableLabels>();
  /** The search box's placeholder. Defaults to the `searchPlaceholder` label. */
  readonly searchPlaceholder = input<string>();
  /**
   * Draw the search box. On by default; a nested table turns it off, since a
   * second search box inside a row reads as chrome rather than as a feature.
   */
  readonly searchable = input(true);
  /**
   * One value per column for a summary row under the body — `aggregate`
   * builds one. A column's `footer` renders its value; without either, no
   * summary row is drawn.
   */
  readonly summaryRow = input<SummaryRowFn<TRow>>();
  /** Keep the view state in the URL. Read once, when the table starts. */
  readonly urlSync = input(true);
  /** Namespace for this table's URL params. Read once. */
  readonly urlKey = input<string>();
  /** Initial view state while the URL is silent. Read once. */
  readonly defaults = input<
    Partial<TableQueryParams> & { extra?: ExtraFilters }
  >();
  /**
   * Pagination mode. Defaults to `"auto"` (phone → infinite). Pass
   * `"infinite"` with {@link virtualize} so the body windows.
   * Read once.
   */
  readonly paginationMode = input<PaginationMode>();
  /**
   * Cap the table body's height; the body scrolls inside the box and a
   * composed {@link virtualize} tracks the box instead of the page.
   */
  readonly maxHeight = input<number | string>();
  /**
   * How many placeholder rows the first-load skeleton draws. Absent, the
   * page size.
   */
  readonly skeletonRows = input<number>();
  /** Which edge a projected side panel sits on. */
  readonly sidePanelSide = input<"start" | "end">("end");
  /** Offer a checkbox on every row. Read once. */
  readonly selectable = input(false);
  /** The selected row ids, to control the selection. */
  readonly selectedIds = input<readonly string[]>();
  /**
   * Arrow keys move between cells. Read once. Prefer composing
   * `cellNavigation()` when listing features; this input still toggles the
   * grid alone.
   */
  readonly cellNavigation = input(false);
  /**
   * Told a range after Cut has reached the clipboard — the context menu and
   * Ctrl/Cmd+X. Read on each cut.
   */
  readonly onCellCut = input<(range: CellRange) => void>();
  /**
   * The features this table composes, such as `columnMenu()`. Read once,
   * when the table starts.
   */
  readonly features = input<readonly AdaptTableFeature[]>([]);
  /** Optional conversation props drawn by a composed assistant feature. */
  readonly assistant = input<TableAssistantProps>();
  /** Optional whole-row version used to detect a live cell edit conflict. */
  readonly rowVersion = input<(row: TRow) => string | number>();
  /** How to resolve incoming changes while a draft is open. Defaults to asking. */
  readonly editConflictPolicy = input<EditConflictPolicy>();
  /** Host conflict decision; takes precedence over the policy. */
  readonly onEditConflict = input<EditConflictHandler<TRow>>();
  /** The column layout, to control it. */
  readonly columnLayout = input<ColumnLayoutState>();
  /** The layout an uncontrolled table starts from. Read once. */
  readonly defaultColumnLayout = input<Partial<ColumnLayoutState>>();
  /**
   * Called when the user renames a column. With it, the Columns menu offers
   * a rename. Read once.
   */
  readonly onColumnRename = input<(key: string, name: string) => void>();
  /**
   * Where the Filters button opens its panel: an anchored popover with no
   * backdrop, or a drawer that dims the page. Read once.
   */
  readonly filtersMode = input<FiltersMode>("popover");
  /** Close a header filter once a single-control write finishes. Read once. */
  readonly closeHeaderFilterOnSelect = input(false);
  /** The host's own chips, shown after the table's filter chips. */
  readonly extraChips = input<readonly ActiveFilterChip[]>([]);
  /** Row density while the URL says nothing. Read once. */
  readonly density = input<TableDensity>();
  /**
   * Asks before an action that declares a `confirm`. Defaults to the
   * browser's `confirm`. Read once.
   */
  readonly confirm = input<ConfirmHandler>();
  /** Every selection change, as the full list of selected ids. */
  readonly selectionChange = output<string[]>();
  /** Every column-layout change. */
  readonly columnLayoutChange = output<ColumnLayoutState>();

  /**
   * Cell templates the host declares inside the table's element.
   *
   * @internal
   */
  protected readonly cellTemplates = contentChildren(AdaptCellTemplate);
  /**
   * The table, once `ngOnInit` has read the inputs it starts from.
   *
   * @internal
   */
  protected readonly view = signal<TableView<TRow> | undefined>(undefined);
  /** A host template rendered under the pager. */
  readonly tableFooter = contentChild<TemplateRef<unknown>>("tableFooter");
  /** A host template rendered beside the body. */
  readonly sidePanel = contentChild<TemplateRef<unknown>>("sidePanel");
  /** The feature panel, stamped only while it is open. */
  private readonly featureSidePanelTpl =
    viewChild<TemplateRef<unknown>>("featureSidePanel");
  /** The side-panel slot. @internal */
  protected readonly sidePanelSlot = SIDE_PANEL;
  /** A pending feature-owned approval, drawn only by its composed kit slot. */
  protected readonly agentApprovalSlot = AGENT_APPROVAL;
  protected readonly tableAssistantSlot = TABLE_ASSISTANT;
  protected readonly agentApprovalProps = computed((): AgentApprovalProps => ({
    pending:
      this.view()?.table.featureState.get(AGENT_APPROVAL_STATE)() ?? null,
    labels: this.view()?.table.labels(),
  }));
  /** The status-bar slot. @internal */
  protected readonly statusBarSlot = STATUS_BAR;
  /** The feature's panel options, read live so a controlled `open` updates. */
  private readonly liveSidePanel = computed(
    () =>
      featureOptionsOf(tableFeaturesOf(this.injector, this.features()))
        .sidePanel as SidePanelOptions | undefined
  );
  /** Which edge the docked panel sits on. */
  protected readonly dockedSide = computed(
    () => this.liveSidePanel()?.side ?? this.sidePanelSide()
  );
  /**
   * The feature panel while it is open; otherwise the host's projected
   * template.
   */
  protected readonly dockedPanel = computed(() => {
    const options = this.liveSidePanel();
    if (options?.open != null) return this.featureSidePanelTpl();
    return this.sidePanel();
  });
  /** Props for the live panel, only while a feature panel is open. */
  protected readonly sidePanelProps = computed(() => {
    const options = this.liveSidePanel();
    if (options?.open == null) return undefined;
    return {
      panels: options.panels,
      openPanel: options.open,
      onOpenPanel: (key: string) => {
        options.onOpenChange(key);
      },
      onClose: () => {
        options.onOpenChange(null);
      },
      side: options.side ?? this.sidePanelSide(),
      labels: this.labels(),
    };
  });
  /** Props for the status strip, while a feature fills it. */
  protected readonly statusBarProps = computed(() => {
    const view = this.view();
    if (!view?.table.hasSlot(STATUS_BAR)) return undefined;
    return statusBarSlotProps(view, featureOptionsOf(this.features()));
  });
  /**
   * Whether the empty table is empty because nothing matched.
   *
   * @internal
   */
  protected readonly noResults = computed(
    () => this.view()?.table.emptyVariant() === "noResults"
  );

  /** The Columns menu's slot. @internal */
  protected readonly columnMenuSlot = COLUMN_MENU;
  /** The filter slots. @internal */
  protected readonly filterSlots = {
    form: FILTERS_FORM,
    popover: FILTER_POPOVER,
    drawer: FILTER_DRAWER,
    chips: ACTIVE_FILTER_CHIPS,
    header: FILTER_HEADER,
  };
  /** The saved-views slot. @internal */
  protected readonly savedViewsSlot = SAVED_VIEWS;
  /** The toolbar extras' slot. @internal */
  protected readonly toolbarExtrasSlot = TOOLBAR_EXTRAS;
  /** The selection bar's slot. @internal */
  protected readonly bulkBarSlot = BULK_BAR;
  /** The batch-edit bar's slot. @internal */
  protected readonly batchEditBarSlot = BATCH_EDIT_BAR;
  /** The grouping strip's slot. @internal */
  protected readonly groupingPanelSlot = GROUPING_PANEL;
  /** The find bar's slot. @internal */
  protected readonly findBarSlot = FIND_BAR;
  /** The command palette slot. @internal */
  protected readonly commandPaletteSlot = COMMAND_PALETTE_LIVE;
  /** The context menu slot. @internal */
  protected readonly contextMenuSlot = CONTEXT_MENU_LIVE;
  private readonly contextMenuRegion = inject(ADAPTTABLE_CONTEXT_MENU);
  /** The row-reorder announcer slot. @internal */
  protected readonly reorderAnnouncerSlot = ROW_REORDER_ANNOUNCER;
  /** The Filters button's glyph. @internal */
  protected readonly filtersIcon = FILTERS_ICON;
  /** The search box's glyph. @internal */
  protected readonly searchIcon = SEARCH_ICON;
  /**
   * The desktop body, when rendered — owns the scroll box virtualization
   * tracks.
   *
   * @internal
   */
  protected readonly desktopTable = viewChild(AdaptDesktopTable);
  /** The phone card list, when rendered — the scroll box on phones. @internal */
  protected readonly mobileCards = viewChild(AdaptMobileCards);
  private readonly filtersForm = viewChild<TemplateRef<unknown>>("filtersForm");
  private readonly filtersTrigger =
    viewChild<TemplateRef<unknown>>("filtersTrigger");
  private readonly injector = inject(Injector);
  private readonly root = viewChild<ElementRef<HTMLElement>>("root");

  /** Start the table from the inputs it reads once. */
  /** Ctrl/Cmd+X and the menu's Cut, after the clipboard write succeeds. */
  private cutSelection(range: CellRange): void {
    this.onCellCut()?.(range);
  }

  /** A right-click inside the table. */
  protected onMenuContext(event: MouseEvent): void {
    this.contextMenuRegion()?.onContextMenu(event);
  }

  /** Shift+F10 or the menu key inside the table. */
  protected onMenuKey(event: KeyboardEvent): void {
    this.contextMenuRegion()?.onKeyDown(event);
  }

  /** A touch press inside the table. */
  protected onMenuPointerDown(event: PointerEvent): void {
    this.contextMenuRegion()?.onPointerDown(event);
  }

  /** A finger moving inside the table. */
  protected onMenuPointerMove(event: PointerEvent): void {
    this.contextMenuRegion()?.onPointerMove(event);
  }

  /** The finger lifted. */
  protected onMenuPointerUp(): void {
    this.contextMenuRegion()?.onPointerUp();
  }

  /** The browser took the pointer. */
  protected onMenuPointerCancel(): void {
    this.contextMenuRegion()?.onPointerCancel();
  }

  /** The phone sort select: a column, or none. */
  protected sortBy(event: Event): void {
    const table = this.view();
    if (table === undefined) return;
    const value = (event.target as HTMLSelectElement).value;
    table.table
      .source()
      .setSort(
        value === "" ? undefined : value,
        table.table.sortDir() ?? "asc"
      );
  }

  ngOnInit(): void {
    const injector = this.injector;
    const labels = computed((): TableLabels | undefined => {
      const placeholder = this.searchPlaceholder();
      return placeholder === undefined
        ? this.labels()
        : { ...this.labels(), searchPlaceholder: placeholder };
    });
    const ownFeatures = this.features();
    const features = tableFeaturesOf(injector, ownFeatures);
    const featureOptions = featureOptionsOf(features);
    const declaredFilters = featureOptions.filters;
    const filtersOn = Array.isArray(declaredFilters);
    const headerOn = featureOptions.headerFilters === true;
    // Filled once the table exists; the table reads the count lazily.
    const filtersRef: { current?: FiltersView } = {};
    // One URL backend for the table, its density and its saved views — a
    // private memory store when the table does not sync with the URL.
    const urlAdapter = urlAdapterFor({ urlSync: this.urlSync() }, injector);
    const viewportMobile = injectIsMobile({ injector });
    const isMobile = computed(() => this.forceMobile() ?? viewportMobile());
    const prebuilt = this.source();
    const data = injectTableData<TRow>({
      source: prebuilt,
      data: this.data,
      mode: this.mode,
      onQueryChange: this.onQueryChange,
      total: this.total,
      loading: this.loading,
      error: this.error,
      supports: this.supports,
      aggregates: this.aggregates,
      responseKey: this.responseKey,
      facets: this.facets,
      facetKeys: this.facetKeys,
      columns: computed(() => flattenColumns(this.columns()).leaves),
      engine: filtersOn || headerOn ? FILTER_ENGINE_IMPL : undefined,
      filters: filtersOn ? (declaredFilters as FilterDef<TRow>[]) : undefined,
      filterTypes: featureOptions.filterTypes as FilterTypeSpec[] | undefined,
      getRowId: (row) => this.rowKey()(row),
      forceMobile: isMobile,
      urlAdapter,
      urlKey: this.urlKey(),
      defaults: this.defaults(),
      paginationMode: this.paginationMode() ?? "auto",
      injector,
    });
    const source = data.source;
    const declaredBulk = featureOptions.bulkActions;
    const bulk = Array.isArray(declaredBulk)
      ? (declaredBulk as BulkAction[])
      : undefined;
    const selection =
      this.selectable() || bulk
        ? injectRowSelection<TRow>({
            rows: computed(() => source().rows),
            rowKey: (row) => this.rowKey()(row),
            selectedIds: this.selectedIds,
            onSelectionChange: (ids) => {
              this.selectionChange.emit(ids);
            },
            labels,
          })
        : undefined;
    // A grouped table renders the full filtered set as one page: a group
    // spans pages. The model reads the source before it is widened.
    const groupingRef = signal<
      Signal<TableGrouping<TRow> | undefined> | undefined
    >(undefined);
    const viewSource = computed(() =>
      groupingRef()?.() === undefined ? source() : groupedViewSource(source())
    );
    const table = injectDataTable<TRow>({
      source: viewSource,
      columns: this.columns,
      rowKey: (row) => this.rowKey()(row),
      tableLabel: this.tableLabel,
      labels,
      dir: this.dir,
      forceMobile: isMobile,
      cellTemplates: this.cellTemplates,
      selection,
      features: ownFeatures,
      activeFilterCount: computed(() => filtersRef.current?.count() ?? 0),
      columnLayout: this.columnLayout,
      onColumnLayoutChange: (next) => {
        this.columnLayoutChange.emit(next);
      },
      defaultColumnLayout: this.defaultColumnLayout(),
      onColumnRename: this.onColumnRename(),
      injector,
    });
    const filters =
      filtersOn || headerOn
        ? filtersViewFor({
            table,
            source,
            runtime: data.runtime,
            mode: this.filtersMode(),
            button: filtersOn,
            header: headerOn,
            closeHeaderFilterOnSelect: this.closeHeaderFilterOnSelect(),
            dir: table.dir,
            extraChips: this.extraChips,
            form: this.filtersForm,
            trigger: this.filtersTrigger,
          })
        : undefined;
    filtersRef.current = filters;
    const confirm = this.confirm() ?? defaultConfirm;
    const rowMutations = injectRowMutations<TRow>(
      computed(() => ({
        onAddRow: featureOptions.onAddRow as (() => unknown) | undefined,
        onDuplicateRow: featureOptions.onDuplicateRow as
          ((row: TRow) => unknown) | undefined,
        onDeleteRow: featureOptions.onDeleteRow as
          ((row: TRow) => unknown) | undefined,
        confirmDeleteRow: featureOptions.confirmDeleteRow as
          boolean | undefined,
        labels: table.labels(),
      })),
      injector
    );
    const rowActions = computed(() =>
      withRowMutationActions({
        host: featureOptions.rowActions as RowAction<TRow>[] | undefined,
        mutations: rowMutations().actions,
        actionsHidden: table.layout().isHidden(ACTIONS_COLUMN_KEY),
      })
    );
    const history = historyFor(
      featureOptions,
      computed(() => table.allColumns()),
      injector
    );
    const bulkBar =
      bulk && selection
        ? computed((): BulkBarSlotProps<SelectionState> => ({
            selection: selection.state(),
            total: source().total,
            bulkActions: bulk,
            confirm,
            labels: table.labels(),
          }))
        : undefined;
    const find = findStateFor({
      enabled: featureOptions.findInTable === true,
      table,
      urlAdapter,
      urlSync: this.urlSync(),
      urlKey: this.urlKey(),
      injector,
    });
    const grid =
      this.cellNavigation() || featureOptions.cellNavigation === true
        ? injectGridFocus({
            table,
            enabled: true,
            find,
            onActivate: (cell) => {
              const rows = table.rows();
              const row = rows[cell.row - table.windowStart()];
              const column = table.columns()[cell.col];
              if (row === undefined || column === undefined) return;
              const rowId = table.rowKey(row);
              // Covered cells have no editor in the rendered body. Resolve
              // the current row and column at the key press, then let core
              // apply the same permission and editor gates as a pointer.
              if (
                !bodyCells()
                  .get(rowId)
                  ?.some((entry) => entry.column.key === column.key)
              )
                return;
              editableCellController({
                editing: editing?.(),
                row,
                column,
                rowId,
                rows,
                columns: table.allColumns(),
                rowKey: table.rowKey,
              }).begin();
            },
            host: computed(
              () =>
                ({
                  onCellEdit: featureOptions.onCellEdit,
                  onCellPaste: featureOptions.onCellPaste,
                  onCellFill: featureOptions.onCellFill,
                  getCellSpan: featureOptions.getCellSpan,
                }) as CellNavigationChannelsOptions<TRow>["host"]
            ),
            recordEdits: history?.().history.record,
            onUndo: history?.().history.undo,
            onRedo: history?.().history.redo,
            onCut: (range) => {
              this.cutSelection(range);
            },
            injector,
          })
        : undefined;
    const root = (): HTMLElement | null => this.root()?.nativeElement ?? null;
    wireFindChrome({ find, grid, root, injector });
    const densityState =
      featureOptions.densityChooser === true
        ? injectDensity({
            urlAdapter,
            urlKey: this.urlKey(),
            defaultDensity: this.density(),
            injector,
          })
        : undefined;
    const fixedDensity = this.density() ?? "comfortable";
    const density = densityState?.density ?? computed(() => fixedDensity);
    const fullscreen =
      featureOptions.fullscreen === true
        ? injectFullscreen(
            computed(() => this.root()?.nativeElement),
            injector
          )
        : undefined;
    const savedViewsOption = featureOptions.savedViews as
      SavedViewsControllerOptions | undefined;
    const savedViews = savedViewsOption
      ? computed((): SavedViewsSlotProps<SavedViewsControllerOptions> => ({
          // The views capture and apply through the table's own backend
          // and namespace; the host's explicit values still win.
          options: {
            urlAdapter,
            urlKey: this.urlKey(),
            ...savedViewsOption,
          },
          labels: table.labels(),
        }))
      : undefined;
    const columnMenuProps = computed((): ColumnMenuSlotProps<never> => ({
      allColumns: table.allColumns() as never,
      layout: table.layout(),
      labels: table.labels(),
      dir: table.dir(),
      sortBy: table.sortBy(),
      sortDir: table.sortDir(),
      onAutoSize: () => {
        table.autoSizeColumns(root());
      },
      onAutoSizeColumn: (key) => {
        table.autoSizeColumn(root(), key);
      },
      onSortColumn: (key, dir) => {
        table.source().setSort(key, dir);
      },
      onRenameColumn: this.onColumnRename()
        ? table.layout().setName
        : undefined,
      hasRowActions: mergedActions().hasRowActions,
    }));
    const grouping = injectGrouping<TRow>({
      table,
      source,
      features,
      injector,
    });
    groupingRef.set(grouping);
    const tree = injectTree<TRow>({ table, source, features, injector });
    const rowDetail = injectRowDetail<TRow>({ features, injector });
    // Pinning refuses a grouped table or a tree: a nested list is not a flat
    // pin stack.
    const pinning = injectTableRowPinning<TRow>({
      features,
      getRowId: (row) => this.rowKey()(row),
      labels: table.labels,
      blocked: computed(
        () => grouping?.() !== undefined || tree?.() !== undefined
      ),
      urlAdapter,
      urlSync: this.urlSync(),
      urlKey: this.urlKey(),
      injector,
    });
    const pinnedRows = computed(() => {
      const pins = pinning?.();
      return pins
        ? partitionPinnedRows(table.source().rows, pins.state, (row) =>
            this.rowKey()(row)
          )
        : undefined;
    });
    const summaryRows = featureOptions.pinnedRows as
      PinnedRows<TRow> | undefined;
    const extraRows = featureOptions.extraRows as
      readonly ExtraRow[] | undefined;
    const getCellSpan = featureOptions.getCellSpan as
      GetCellSpan<TRow> | undefined;
    const exportOption = featureOptions.exportCsv as
      boolean | ExportCsvOptions<TRow> | undefined;
    const exporter =
      exportOption === undefined || exportOption === false
        ? undefined
        : injectExportCsv<TRow>({
            exportCsv: exportOption,
            source: table.source,
            columns: table.columns,
            context: computed(() => ({
              selectedIds: selection?.selectedIds(),
              getRowId: (row: TRow) => this.rowKey()(row),
              allColumns: table.allColumns(),
              range: grid?.range(),
              firstRowIndex: table.windowStart(),
              getCellSpan,
              grouping: grouping?.(),
              tree: tree?.(),
              groupTotal: table.labels().groupTotal,
              summaryRow: this.summaryRow(),
            })),
            labels: table.labels,
            featureHost: table.featureHost,
            injector,
          });
    const toolbarExtras = computed((): ToolbarExtrasSlotProps => ({
      density: density(),
      onDensityChange: (next) => {
        densityState?.setDensity(next);
      },
      onToggleFullscreen: fullscreen?.().supported
        ? fullscreen().toggle
        : undefined,
      isFullscreen: fullscreen?.().active,
      ...exporter?.(),
      ...(history
        ? undoRedoToolbarProps(
            featureOptions.undoRedoButtons === true,
            history().history,
            table.labels()
          )
        : {}),
      ...printToolbarProps(
        featureOptions.printButton === true,
        featureOptions.onPrint as (() => void) | undefined,
        table.labels()
      ),
      labels: table.labels(),
    }));
    const assembly = featureOptions.assembly as
      Partial<AssemblyFns<TRow>> | undefined;
    const rowClassName = featureOptions.rowClassName as
      ((row: TRow, index: number) => string | undefined) | undefined;
    const rowStyle = featureOptions.rowStyle as RowStyle<TRow> | undefined;
    const rowHeight = featureOptions.rowHeight as RowHeight<TRow> | undefined;
    const isCellFlashing = (rowId: string, columnKey: string): boolean => {
      const reader =
        this.isCellFlashing() ??
        (featureOptions.isCellFlashing as
          ((rowId: string, columnKey: string) => boolean) | undefined);
      return reader?.(rowId, columnKey) ?? false;
    };
    // The pin entries ride the actions column beside the host's actions.
    const mergedActions = computed(() =>
      withRowPinActions({
        rowActions: rowActions().rowActions,
        hasRowActions: rowActions().hasRowActions,
        pinning: pinning?.() !== undefined,
        pins: pinning?.()?.actions ?? [],
        actionsHidden: table.layout().isHidden(ACTIONS_COLUMN_KEY),
      })
    );
    const groupingPanel = injectGroupingPanelState({
      table,
      source: viewSource,
      features,
      grouping,
      injector,
    });
    const reorder = injectRowReorder({
      table,
      source: viewSource,
      features,
      grouping,
      injector,
    });
    const editing = editingBundleFor<TRow>({
      live: computed(() => ({
        rows: renderedRowsOf({ source: viewSource(), grouping: grouping?.() }),
        columns: table.allColumns(),
        rowKey: this.rowKey(),
        rowVersion:
          this.rowVersion() ??
          (featureOptions.rowVersion as LiveEditConflictInput<TRow>["rowVersion"]),
        editConflictPolicy:
          this.editConflictPolicy() ??
          (featureOptions.editConflictPolicy as EditConflictPolicy | undefined),
        onEditConflict:
          this.onEditConflict() ??
          (featureOptions.onEditConflict as
            EditConflictHandler<TRow> | undefined),
      })),
      featureOptions: editingOptionsFor(featureOptions, history),
      columns: computed(() => table.allColumns()),
      featureHost: table.featureHost,
      labels: table.labels,
      injector,
    });
    mountLiveFeatures({
      table,
      source: viewSource,
      features,
      filters: data.runtime,
      grouping,
      tree,
      pinning,
      selection,
      editing,
      rowActions: featureOptions.rowActions as
        readonly RowAction<TRow>[] | undefined,
      bulkActions: bulk,
      injector,
    });
    const batchBar =
      editing === undefined
        ? undefined
        : computed((): BatchEditBarProps<TRow> | undefined => {
            const current = editing();
            if (current.batch === undefined) return undefined;
            return {
              batch: current.batch,
              contested: current.conflict?.anyContested,
              labels: table.labels(),
            };
          });
    const bodyWindow = bodyWindowFor({
      table,
      grouping,
      tree,
      expandable: rowDetail !== undefined,
      scrollRows: computed(() => pinnedRows()?.scroll ?? table.source().rows),
      featureOptions,
      rowKey: (row) => this.rowKey()(row),
      maxHeight: this.maxHeight(),
      scrollBox: () =>
        (table.isMobile()
          ? this.mobileCards()?.scrollElement()
          : this.desktopTable()?.scrollElement()) ?? null,
      root: () => this.root()?.nativeElement ?? null,
      injector,
    });
    scrollFindWindow({
      find,
      rows: computed(() => table.source().rows),
      firstRowIndex: computed(() => table.windowStart()),
      scrollToIndex: () => bodyWindow().scrollToRowIndex,
      injector,
    });
    const virtualization = computed(() => bodyWindow().virtualization);
    const rowKey = computed(() => this.rowKey());
    const rowActionList = computed(() => mergedActions().rowActions);
    const columnWindow = injectColumnWindow<TRow>({
      columns: table.columns,
      enabled: featureOptions.virtualizeColumns === true,
      widths: computed(() => table.layout().state.widths),
      pinnedKeys: computed(() => {
        const { pinned } = table.layout().state;
        return new Set(
          Object.keys(pinned).filter((key) => pinned[key] !== undefined)
        );
      }),
      getScrollElement: () => this.desktopTable()?.scrollElement() ?? null,
      injector,
    });
    // Core's render model: the rendered (possibly windowed) columns, the
    // spacer widths, the injected columns and the full-width span.
    const renderModel = computed(() => {
      const window = bodyWindow();
      const entries = window.groupingEntries;
      return chromeRenderModel({
        table: {
          columns: table.columns(),
          selection: selection?.state() ?? null,
          labels: table.labels(),
        },
        rows: table.source().rows,
        rowActions: rowActionList(),
        getRowId: rowKey(),
        rowEntries: window.virtualization.rows,
        columnWindow: columnWindow(),
        editing: editing?.(),
        rowReorder: reorder?.(),
        grouping: entries === undefined ? undefined : { entries },
        renderRowDetail: rowDetail?.(),
        expansion: rowDetail?.().expansion,
        pinnedTopRows: pinnedRows()?.top ?? [],
        pinnedBottomRows: pinnedRows()?.bottom ?? [],
        pinnedSummaryTop: summaryRows?.top ?? [],
        pinnedSummaryBottom: summaryRows?.bottom ?? [],
        tree:
          window.treeEntries === undefined
            ? undefined
            : { entries: window.treeEntries },
        getCellSpan,
        extraRows,
        assembly,
      });
    });
    // Each drawn row's cells, as core's span pass left them: a cell another
    // one covers is absent, and a merged cell carries its extent.
    const bodyCells = computed(() => {
      const byKey = new Map(
        renderModel().columns.map((column) => [column.key, column])
      );
      const cells = new Map<string, readonly BodyCellView<TRow>[]>();
      for (const [rowId, rowCells] of renderModel().cellsByRow) {
        cells.set(
          rowId,
          rowCells.flatMap((cell) => {
            const column = byKey.get(cell.column.key);
            return column === undefined
              ? []
              : [
                  {
                    column,
                    columnIndex: cell.columnIndex,
                    colSpan: cell.colSpan,
                    rowSpan: cell.rowSpan,
                    mark: cellSpanMark(cell.colSpan, cell.rowSpan),
                  },
                ];
          })
        );
      }
      return cells;
    });
    const showActions = computed(() => renderModel().showActions);
    const bodyColSpan = computed(() => renderModel().columnSpan);
    const renderedColumns = computed(() => renderModel().columns);
    const columnSpacers = computed(() => renderModel().columnSpacers);
    const columnIndex = computed(
      () => new Map(table.columns().map((column, index) => [column.key, index]))
    );
    // A virtualized row hands itself to the window, which measures it — with
    // its open detail row, as one item, when rows can expand.
    const withRef = (
      attrs: Attrs,
      ref: ((node: Element | null) => void) | undefined
    ): Attrs => (ref === undefined ? attrs : { ...attrs, ref });
    const measured = (attrs: Attrs): Attrs =>
      withRef(attrs, virtualization().measureElement);
    // A pinned row keeps its place above or below the scrolling rows, stuck
    // there inside a scroll box; a host summary row is marked and named, with
    // none of a data row's interactions. A pinned card is an ordinary card.
    const pinSticky = this.maxHeight() != null;
    const pinnedAttrs = (
      attrs: Attrs,
      args: DesktopRowWiringArgs<TRow>,
      card: boolean
    ): Attrs => {
      const side = args.rowPinSide;
      if (side === undefined) return attrs;
      const summary = args.summary === true;
      if (card && !summary) return attrs;
      const style = attrs.style;
      return {
        ...attrs,
        "data-adapttable-part": summary
          ? pinnedSummaryPart(side)
          : pinnedRowPart(side),
        "data-row-pin": side,
        "aria-selected": summary ? undefined : attrs["aria-selected"],
        "aria-label": summary
          ? table.labels().pinnedSummaryRow
          : attrs["aria-label"],
        style: card
          ? style
          : {
              ...(typeof style === "object" && style !== null ? style : {}),
              ...pinnedRowSticky(side, pinSticky, 0),
            },
      };
    };
    // The host's class, style and height for a row or its card.
    const appearance = (
      attrs: Attrs,
      args: DesktopRowWiringArgs<TRow>
    ): Attrs => {
      const className = rowClassName?.(args.row, args.sourceIndex);
      const style = resolveRowStyle(
        rowStyle,
        rowHeight,
        args.row,
        args.sourceIndex
      );
      if (className === undefined && style === undefined) return attrs;
      const base = attrs.style;
      return {
        ...attrs,
        class: className,
        style: {
          ...(typeof base === "object" && base !== null ? base : {}),
          ...style,
        },
      };
    };
    // Core owns activation, interactive-child guards and arrow-key roving.
    // Pinned summaries are read-only labels, never row-navigation stops.
    const interactiveAttrs = (
      attrs: Attrs,
      args: DesktopRowWiringArgs<TRow>,
      focusIndex: number
    ): Attrs => {
      if (args.summary === true) {
        return { ...attrs, "data-selected": undefined };
      }
      const click = rowClickProps(
        args.row,
        this.onRowClick() ??
          (featureOptions.onRowClick as ((row: TRow) => void) | undefined),
        focusIndex
      );
      return {
        ...attrs,
        ...click,
        "data-clickable": click ? "" : undefined,
        "data-dirty": rowIsDirty(editing?.(), args.id) ? "" : undefined,
        style: {
          ...click?.style,
          ...(typeof attrs.style === "object" && attrs.style !== null
            ? attrs.style
            : {}),
        },
      };
    };
    const body = computed((): readonly BodySlot<TRow>[] => {
      const window = bodyWindow();
      const entries = window.groupingEntries;
      let focusIndex = 0;
      return desktopBodySlots<TRow, BodyRow<TRow>>({
        pinnedTopRows: pinnedRows()?.top ?? [],
        pinnedBottomRows: pinnedRows()?.bottom ?? [],
        pinnedSummaryTop: summaryRows?.top ?? [],
        pinnedSummaryBottom: summaryRows?.bottom ?? [],
        extraRows,
        extraFill: (key) =>
          extraHostFillStyle(
            key,
            extraRows,
            table.source().rows,
            rowKey(),
            rowStyle
          ),
        insertExtraRows,
        insertExtrasBeforeRows,
        paddingTop: window.virtualization.paddingTop,
        paddingBottom: window.virtualization.paddingBottom,
        grouping: entries === undefined ? undefined : { entries },
        entries: window.virtualization.rows,
        tree:
          window.treeEntries === undefined
            ? undefined
            : { entries: window.treeEntries },
        getRowId: rowKey(),
        columnSpan: bodyColSpan(),
        rows: table.source().rows,
        wiring: (args) => {
          const window = virtualization();
          const rowFocusIndex = args.summary === true ? -1 : focusIndex++;
          return {
            ...args,
            rowAttrs: withRef(
              pinnedAttrs(
                interactiveAttrs(
                  appearance(
                    grid && args.summary !== true
                      ? grid.rowAttrs(args.row, args.index)
                      : table.rowAttrs(args.row, args.index),
                    args
                  ),
                  args,
                  rowFocusIndex
                ),
                args,
                false
              ),
              desktopRowMeasureRef(
                args.rowPinSide,
                window.measureRowPair,
                args.index,
                window.measureElement
              )
            ),
            cardAttrs: (args.measure ? measured : (attrs: Attrs) => attrs)(
              pinnedAttrs(
                interactiveAttrs(
                  appearance(table.cardAttrs(args.row, args.index), args),
                  args,
                  rowFocusIndex
                ),
                args,
                true
              )
            ),
            detailAttrs: withRef(
              {},
              desktopDetailMeasureRef(
                args.rowPinSide,
                window.measureRowPair,
                args.index
              )
            ),
          };
        },
      });
    });
    const bodyRows = computed(() =>
      body().flatMap((slot) => (slot.kind === "row" ? [slot.wiring] : []))
    );
    const editableCells =
      editing === undefined
        ? undefined
        : editableCellsFor({ table, editing, rows: bodyRows, rowKey });
    const actionsCells = actionsCellsFor({
      table,
      editing,
      rowActions: rowActionList,
      rows: bodyRows,
      rowKey,
    });
    const expandToggles = computed(() => {
      const toggles = new Map<string, ExpandToggleSlotProps>();
      const detail = rowDetail?.();
      if (!detail) return toggles;
      const labels = table.labels();
      const dir = table.dir();
      for (const entry of bodyRows()) {
        const id = entry.id;
        toggles.set(id, {
          id,
          expanded: detail.expansion.isExpanded(id),
          onToggle: detail.expansion.toggle,
          dir,
          expandLabel: labels.expandRow,
          collapseLabel: labels.collapseRow,
        });
      }
      return toggles;
    });
    const summaryRow = this.summaryRow();
    const summary = computed(() =>
      summaryRow === undefined ? undefined : summaryRow(table.source().rows)
    );
    const showSummary = computed(
      () =>
        summaryRow !== undefined ||
        table.columns().some((column) => column.footer !== undefined)
    );
    const detailParent = computed((): NestedTableParent => ({
      density: density(),
      labels: labels(),
    }));
    const groupHeaders = groupHeadersFor({
      table,
      grouping: grouping ?? computed(() => undefined),
      slots: body,
      columns: renderedColumns,
      selection,
      leadingCells: computed(() => renderModel().leadingCells),
      showActions,
    });
    const findBar = findBarFor(find, table.labels);
    const commandPalette = commandPalettePropsFor({
      commandPalette:
        featureOptions.commandPalette as CommandPaletteInjectOptions["commandPalette"],
      onPrint: featureOptions.onPrint as (() => void) | undefined,
      labels: table.labels,
      clearFilters: table.clearFilters,
      featureHost: table.featureHost,
      exportCsv: exporter,
      filterCount: computed(() => filtersRef.current?.count() ?? 0),
    });
    const contextMenu = mountedContextMenu({
      contextMenu:
        featureOptions.contextMenu as TableContextMenuOptions<TRow>["contextMenu"],
      table,
      pinning,
      grid,
      filters,
      rowKey: (row) => this.rowKey()(row),
      onCellCut: this.onCellCut,
    });
    const cellAttrs = cellAttrsWithFind(table, grid, find);
    const markedCellAttrs = (
      column: ColumnDef<TRow>,
      index: number,
      col: number,
      rowId?: string
    ): Attrs => {
      return {
        ...cellAttrs(column, index, col),
        "data-flash":
          rowId !== undefined && isCellFlashing(rowId, column.key)
            ? ""
            : undefined,
      };
    };
    this.view.set({
      table,
      classNames: this.classNames,
      renderCard: this.renderCard,
      renderRowActions: this.renderRowActions,
      isCellFlashing,
      selection,
      grid,
      findBar,
      commandPalette,
      contextMenu,
      markedCellAttrs,
      columnMenu: table.featureOptions.enableColumnMenu === true,
      columnMenuProps,
      filters,
      bulkBar,
      rowActions: rowActionList,
      density,
      toolbarExtras,
      rowMutations,
      savedViews,
      groupingPanel,
      reorder,
      tree,
      treeCellFilled: table.slotFills.has(TREE_CELL.id),
      columnSelect:
        grid !== undefined && featureOptions.columnSelectionCheckbox === true,
      rowDetail,
      bodyCells,
      cellSpanAppearance: featureOptions.cellSpanAppearance as
        CellSpanAppearance | undefined,
      expandToggles,
      detailParent,
      summary,
      showSummary,
      editing,
      editableCells,
      showActions,
      actionsCells,
      batchBar,
      grouping,
      virtualization,
      body,
      groupHeaders,
      bodyColSpan,
      columns: renderedColumns,
      columnSpacers,
      columnIndex,
      rowActionsLayout: featureOptions.rowActionsLayout as
        RowActionsLayout | undefined,
      confirm,
    });
  }
}

/** Grouping keys from a feature patch, which may be one key or a list. */
function groupByKeys(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value as readonly string[];
}

/** What the status strip shows for one table. */
function statusBarSlotProps<TRow>(
  view: TableView<TRow>,
  options: Readonly<Record<string, unknown>>
) {
  const source = view.table.source();
  const columns = view.table.columns();
  const keys = groupByKeys(options.groupBy);
  const labels = view.table.labels();
  return {
    enabled: options.statusBar === true,
    shown: source.rows.length,
    page: source.page,
    limit: source.limit,
    total: source.total,
    selected: view.selection?.selectedCount() ?? 0,
    stats:
      options.selectionStats === true
        ? selectionStatsOf({
            enabled: true,
            range: view.grid?.range() ?? null,
            rows: source.rows,
            columns,
            firstRowIndex: view.table.windowStart(),
          })
        : null,
    labels,
    notices: chromeFeatureNotices({
      options: {
        virtualize: options.virtualize === true,
        onCellEdit: options.onCellEdit,
        rowEditing: options.rowEditing === true,
        onRowEdit: options.onRowEdit,
        batchEditing: options.batchEditing === true,
        onBatchEdit: options.onBatchEdit,
        exportCsv: options.exportCsv as
          boolean | ExportCsvOptions<TRow> | undefined,
        pinnedRowIds: options.pinnedRowIds,
        onPinnedRowIdsChange: options.onPinnedRowIdsChange,
      },
      source,
      groupByKeys: keys,
      rowReorderRequested:
        options.rowReorder != null && options.rowReorder !== false,
      nestedArmed:
        keys.length > 0 || options.tree != null || options.nestedTable != null,
      hasEditableColumn: columns.some((column) => column.editable != null),
      labels,
    }),
  };
}
