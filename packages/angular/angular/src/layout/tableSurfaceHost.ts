/**
 * The one structural body both Angular compositions render.
 *
 * The compatibility shell keeps its direct inputs and the controllers those
 * inputs create, then asks this module for the body. A lean host mounts only
 * the features the caller lists. This module does not import the shell.
 */
import {
  type AdaptTableFeature,
  type Attrs,
  type ColumnDef,
  type ColumnInput,
  createFeatureResources,
  type DataTable,
  type DataTableClassNames,
  type EditableCellEditing,
  featureOptionsOf,
  flattenColumns,
  type GridFocus,
  injectDataTable,
  injectKeyedVirtualization,
  injectTableData,
  injectTableVirtualizer,
  type MaybeSignal,
  type MaybeSignalOptional,
  type MobileCardRenderer,
  mountTableFeatures,
  readMaybe,
  type RowSelection,
  type SummaryRowFn,
  SURFACE_EDITING,
  SURFACE_GRID,
  SURFACE_GROUPING,
  SURFACE_HANDLES,
  type SurfaceHandles,
} from "@adapttable/angular";
import {
  type CellSpanAppearance,
  type CssProperties,
  devWarn,
  type ExtraRow,
  type FrontendEngineFactory,
  type GetCellSpan,
  type NestedTableParent,
  type PinnedRows,
  pinnedSummaryPart,
  resolveDensity,
  type RowAction,
  rowClickProps,
  type RowHeight,
  type RowStyle,
  type TableDensity,
  type TableLabels,
  type TableSource,
  type TableVirtualization,
  type TreeEntry,
  windowGroupedEntries,
} from "@adapttable/core";
import {
  type AssemblyFns,
  bodyWindowKind,
  cellSpanMark,
  type ChromeBodySlot,
  chromeRenderModel,
  desktopBodySlots,
  desktopDetailMeasureRef,
  desktopRowMeasureRef,
  type DesktopRowWiringArgs,
  desktopStickyPlan,
  type EditableCellSlotProps,
  estimateBodyItemSize,
  type ExpandToggleSlotProps,
  extraHostFillStyle,
  type GroupedFlatEntry,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  type GroupingPanelSlotProps,
  insertExtraRows,
  insertExtrasBeforeRows,
  pinnedRowPart,
  pinnedRowSticky,
  resolveBodyVirtualization,
  resolveRowStyle,
  virtualizeIgnoredOnPage,
} from "@adapttable/core/binding";
import {
  resolveRowEditTrigger,
  rowEditConflict,
} from "@adapttable/core/editing";
import {
  computed,
  DestroyRef,
  inject,
  Injector,
  type Signal,
  signal,
} from "@angular/core";

import type { RowEditActionsProps } from "../editing/rowEditGate";
import { rowIsDirty } from "../editing/rowEditingHelpers";
import type { TableGrouping } from "../grouping/tableGrouping";
import type { RowReorderState } from "../rows/rowReorder";
import { frontendRowModelOf } from "../source/rowModel";
import type { TableRowDetail } from "../tree/tableRowDetail";
import type { TableTree } from "../tree/tableTree";
import { type ColumnWindow, injectColumnWindow } from "../virtual/columnWindow";
import { injectMeasuredWindowScrollMargin } from "../virtual/windowScrollMargin";
import { tableRuntimeFor } from "./tableRuntime";

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
export function bodyWindowFor<TRow>(options: {
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

interface SurfaceBodyInput<TRow> {
  readonly table: DataTable<TRow>;
  readonly bodyWindow: Signal<{
    readonly virtualization: TableVirtualization<TRow>;
    readonly groupingEntries: readonly GroupedFlatEntry<TRow>[] | undefined;
    readonly treeEntries: readonly TreeEntry<TRow>[] | undefined;
  }>;
  readonly columnWindow: Signal<ColumnWindow<TRow>>;
  readonly selection: RowSelection | undefined;
  readonly grid: GridFocus<TRow> | undefined;
  readonly editing: Signal<EditableCellEditing<TRow>> | undefined;
  readonly reorder: Signal<RowReorderState<TRow>> | undefined;
  readonly grouping: Signal<TableGrouping<TRow> | undefined> | undefined;
  readonly rowDetail: Signal<TableRowDetail<TRow>> | undefined;
  readonly pinnedRows: Signal<
    | {
        readonly top: readonly TRow[];
        readonly bottom: readonly TRow[];
        readonly scroll: readonly TRow[];
      }
    | undefined
  >;
  readonly summaryRows: PinnedRows<TRow> | undefined;
  readonly extraRows: readonly ExtraRow[] | undefined;
  readonly getCellSpan: GetCellSpan<TRow> | undefined;
  readonly rowActionList: Signal<RowAction<TRow>[] | undefined>;
  readonly rowKey: Signal<(row: TRow) => string>;
  readonly assembly: Partial<AssemblyFns<TRow>> | undefined;
  readonly rowClassName:
    ((row: TRow, index: number) => string | undefined) | undefined;
  readonly rowStyle: RowStyle<TRow> | undefined;
  readonly rowHeight: RowHeight<TRow> | undefined;
  readonly density: Signal<TableDensity>;
  readonly labels: Signal<TableLabels | undefined>;
  readonly featureOptions: Readonly<Record<string, unknown>>;
  readonly maxHeight: () => number | string | undefined;
  readonly stickyHeader: () => boolean;
  readonly stickyTop: () => number;
  readonly onRowClick: () => ((row: TRow) => void) | undefined;
  readonly summaryRow: () => SummaryRowFn<TRow> | undefined;
}

export function buildSurfaceBody<TRow>(input: SurfaceBodyInput<TRow>) {
  const {
    table,
    bodyWindow,
    columnWindow,
    selection,
    grid,
    editing,
    reorder,
    grouping,
    rowDetail,
    pinnedRows,
    summaryRows,
    extraRows,
    getCellSpan,
    rowActionList,
    rowKey,
    assembly,
    rowClassName,
    rowStyle,
    rowHeight,
    density,
    labels,
    featureOptions,
  } = input;
  const virtualization = computed(() => bodyWindow().virtualization);
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
  // The header sticks to the page, or at 0 inside a scroll box: a maxHeight
  // box, or one that scrolls sized columns sideways.
  const headerHeight = signal(0);
  const stickyPlan = computed(() => {
    const tableStyle = table.tableAttrs().style;
    return desktopStickyPlan({
      maxHeight: input.maxHeight() == null ? undefined : 0,
      hasPinned: false,
      overflowing:
        typeof tableStyle === "object" &&
        tableStyle !== null &&
        "minWidth" in tableStyle &&
        Boolean(tableStyle.minWidth),
      stickyHeader: input.stickyHeader(),
      stickyTop: input.stickyTop(),
      headerHeight: headerHeight(),
    });
  });
  const pinSticky = input.maxHeight() != null || input.stickyHeader();
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
            ...pinnedRowSticky(side, pinSticky, stickyPlan().rowPinOffset),
            // A pinned total is the host's figure, not a record: semibold.
            ...(summary ? { fontWeight: 600 } : {}),
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
      input.onRowClick() ??
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
  const summary = computed(() => input.summaryRow()?.(table.source().rows));
  const showSummary = computed(
    () =>
      input.summaryRow() !== undefined ||
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
  return {
    renderModel,
    body,
    bodyCells,
    showActions,
    bodyColSpan,
    renderedColumns,
    columnSpacers,
    columnIndex,
    virtualization,
    groupHeaders,
    editableCells,
    actionsCells,
    expandToggles,
    summary,
    showSummary,
    detailParent,
    stickyHead: computed(() => stickyPlan().stickyStyle),
    reportHeaderHeight: (px: number): void => {
      headerHeight.set(px);
    },
  };
}

/**
 * The structural view shared by the compatibility shell and the lean host.
 * Desktop and mobile chrome read this. The shell's {@link TableView} adds
 * the convenience controllers.
 *
 * @public
 */
export interface TableSurfaceView<TRow> {
  /** The headless table. */
  readonly table: DataTable<TRow>;
  /** Live class hooks for the mobile and row-action parts. */
  readonly classNames: Signal<DataTableClassNames>;
  /** A host template or component replacing only the card's field layout. */
  readonly renderCard: Signal<MobileCardRenderer<TRow> | undefined>;
  /** Row selection, when the table is selectable. */
  readonly selection: RowSelection | undefined;
  /** Cell navigation, when it is on. */
  readonly grid: GridFocus<TRow> | undefined;
  /** The row density the root states. */
  readonly density: Signal<TableDensity>;
  /** The header's sticky style, absent unless `stickyHeader` is on. */
  readonly stickyHead: Signal<CssProperties | undefined>;
  /** A desktop table reports its header's height, so pinned rows sit below it. */
  readonly reportHeaderHeight: (px: number) => void;
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
  /** Cell editing bundle, when an editing feature is composed. */
  readonly editing: Signal<EditableCellEditing<TRow>> | undefined;
  /** Each window cell's editable-cell props, when editing is composed. */
  readonly editableCells:
    Signal<ReadonlyMap<string, EditableCellSlotProps<never>>> | undefined;
  /** Whether the actions column is drawn. */
  readonly showActions: Signal<boolean>;
  /** Each window row's actions cell, keyed by row id. */
  readonly actionsCells: Signal<ReadonlyMap<string, RowActionsCell<TRow>>>;
  /** The grouped model, while grouping is composed. */
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
 * Rows, columns and the features a lean host composes. Pass `data` for a
 * frontend table or `source` for a source the caller already built.
 *
 * @public
 */
export interface TableSurfaceHostOptions<TRow> {
  /** Frontend rows. Omit when `source` is set. */
  readonly data?: MaybeSignalOptional<readonly TRow[]>;
  /** A prebuilt source. Omit when `data` is set. */
  readonly source?: MaybeSignalOptional<TableSource<TRow>>;
  /** Column definitions, and header groups over them. */
  readonly columns: MaybeSignal<readonly ColumnInput<TRow>[]>;
  /** A row's stable id. */
  readonly rowKey: (row: TRow) => string;
  /** Features this host mounts. Omitted features are not created. */
  readonly features?: MaybeSignalOptional<readonly AdaptTableFeature[]>;
  /** Bounds the body and scrolls inside it. */
  readonly maxHeight?: MaybeSignalOptional<number | string>;
  /** Stick the header while the page scrolls. */
  readonly stickyHeader?: MaybeSignalOptional<boolean>;
  /** Offset for a stuck header, in pixels. */
  readonly stickyTop?: MaybeSignalOptional<number>;
  /** Called when a row is activated. */
  readonly onRowClick?: MaybeSignalOptional<(row: TRow) => void>;
  /** Summary values for the trailing row. */
  readonly summaryRow?: MaybeSignalOptional<SummaryRowFn<TRow>>;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * A source-driven structural table. It mounts only the features it is given
 * and renders through the same body as the compatibility shell.
 *
 * @public
 */
export function injectTableSurfaceHost<TRow>(
  options: TableSurfaceHostOptions<TRow>
): Signal<TableSurfaceView<TRow>> {
  const parent = options.injector ?? inject(Injector);
  const resources = createFeatureResources(parent);
  return resources.use("surface", [], (child) => {
    const featureList = computed(() => readMaybe(options.features) ?? []);
    const featureOptions = featureOptionsOf(featureList());
    const columns = computed(
      () => flattenColumns(readMaybe(options.columns)).leaves
    );
    const data = injectTableData<TRow>({
      source: options.source,
      data: options.data,
      columns,
      getRowId: options.rowKey,
      createEngine: computed(
        () =>
          frontendRowModelOf(featureList()) as
            FrontendEngineFactory<TRow> | undefined
      ),
      urlSync: false,
      injector: child,
    });
    const groupingRef = signal<
      Signal<TableGrouping<TRow> | undefined> | undefined
    >(undefined);
    const projector = signal<
      (source: TableSource<TRow>, model: unknown) => TableSource<TRow>
    >((source) => source);
    const viewSource = computed(() =>
      projector()(data.source(), groupingRef()?.())
    );
    const table = injectDataTable<TRow>({
      source: viewSource,
      columns: options.columns,
      rowKey: options.rowKey,
      features: featureList,
      injector: child,
    });
    const handles: SurfaceHandles<TRow> = {
      table,
      source: data.source,
      viewSource,
      get features() {
        return featureList();
      },
      groupingModel: () => groupingRef()?.(),
      installProjector: (project) => {
        projector.set(project);
      },
      publishGrouping: (grouping) => {
        groupingRef.set(
          grouping as Signal<TableGrouping<TRow> | undefined> | undefined
        );
      },
    };
    const scope = Injector.create({
      providers: [{ provide: SURFACE_HANDLES, useValue: handles }],
      parent: child,
    });
    child.get(DestroyRef).onDestroy(() => {
      scope.destroy();
    });
    const runtime = tableRuntimeFor(
      table,
      viewSource,
      featureList,
      computed(() => {
        const model = groupingRef()?.();
        return model === undefined ? undefined : { entries: model.entries };
      })
    );
    mountTableFeatures(featureList, {
      runtime,
      state: table.featureState,
      injector: scope,
    });
    const grid = table.featureState.get(SURFACE_GRID)() as
      GridFocus<TRow> | undefined;
    const grouping = table.featureState.get(SURFACE_GROUPING)() as
      Signal<TableGrouping<TRow> | undefined> | undefined;
    const editing = table.featureState.get(SURFACE_EDITING)() as
      Signal<EditableCellEditing<TRow>> | undefined;
    const bodyWindow = bodyWindowFor<TRow>({
      table,
      grouping,
      tree: undefined,
      expandable: false,
      scrollRows: computed(() => table.source().rows),
      featureOptions,
      rowKey: options.rowKey,
      maxHeight: readMaybe(options.maxHeight),
      scrollBox: () => null,
      root: () => null,
      injector: child,
    });
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
      getScrollElement: () => null,
      injector: child,
    });
    const rowKey = computed(() => options.rowKey);
    const surface = buildSurfaceBody<TRow>({
      table,
      bodyWindow,
      columnWindow,
      selection: undefined,
      grid,
      editing,
      reorder: undefined,
      grouping,
      rowDetail: undefined,
      pinnedRows: computed(() => undefined),
      summaryRows: featureOptions.pinnedRows as PinnedRows<TRow> | undefined,
      extraRows: featureOptions.extraRows as readonly ExtraRow[] | undefined,
      getCellSpan: featureOptions.getCellSpan as GetCellSpan<TRow> | undefined,
      rowActionList: computed(
        () => featureOptions.rowActions as RowAction<TRow>[] | undefined
      ),
      rowKey,
      assembly: featureOptions.assembly as
        Partial<AssemblyFns<TRow>> | undefined,
      rowClassName: featureOptions.rowClassName as
        ((row: TRow, index: number) => string | undefined) | undefined,
      rowStyle: featureOptions.rowStyle as RowStyle<TRow> | undefined,
      rowHeight: featureOptions.rowHeight as RowHeight<TRow> | undefined,
      density: computed(() => resolveDensity(undefined, undefined)),
      labels: computed(() => table.labels()),
      featureOptions,
      maxHeight: () => readMaybe(options.maxHeight),
      stickyHeader: () => readMaybe(options.stickyHeader) ?? false,
      stickyTop: () => readMaybe(options.stickyTop) ?? 0,
      onRowClick: () => readMaybe(options.onRowClick),
      summaryRow: () => readMaybe(options.summaryRow),
    });
    const classNames = computed((): DataTableClassNames => ({}));
    const renderCard = signal<MobileCardRenderer<TRow> | undefined>(undefined);
    const view: TableSurfaceView<TRow> = {
      table,
      classNames,
      renderCard,
      selection: undefined,
      grid,
      density: computed(() => resolveDensity(undefined, undefined)),
      groupingPanel: undefined,
      reorder: undefined,
      tree: undefined,
      treeCellFilled: false,
      columnSelect: false,
      rowDetail: undefined,
      cellSpanAppearance: featureOptions.cellSpanAppearance as
        CellSpanAppearance | undefined,
      editing,
      grouping,
      stickyHead: surface.stickyHead,
      reportHeaderHeight: surface.reportHeaderHeight,
      expandToggles: surface.expandToggles,
      bodyCells: surface.bodyCells,
      detailParent: surface.detailParent,
      summary: surface.summary,
      showSummary: surface.showSummary,
      editableCells: surface.editableCells,
      showActions: surface.showActions,
      actionsCells: surface.actionsCells,
      virtualization: surface.virtualization,
      body: surface.body,
      groupHeaders: surface.groupHeaders,
      bodyColSpan: surface.bodyColSpan,
      columns: surface.renderedColumns,
      columnSpacers: surface.columnSpacers,
      columnIndex: surface.columnIndex,
    };
    return signal(view);
  });
}
