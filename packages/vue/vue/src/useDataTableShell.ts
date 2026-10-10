/** One source, feature lifecycle and model composition shared by every Vue kit. */
import {
  ACTIONS_COLUMN_KEY,
  type BulkAction,
  type CellEdit,
  type CellRange,
  type ConfirmHandler,
  createMemoryAdapter,
  type ExtraFilters,
  type FilterDef,
  type FilterTypeSpec,
  groupedViewSource,
  isCellEditable,
  type QueryFilterGroup,
  REORDER_COLUMN_KEY,
  resolveUrlAdapter,
  type RowAction,
  type TableDensity,
  type TableSource,
  withRowPinActions,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  COLUMN_SELECT,
  DENSITY_STATE,
  EMPTY_FEATURE_HOST,
  type FeatureHostState,
  type FilterEngine,
  FIND_BAR,
  type RuntimeChromeInput,
  STATUS_BAR,
  TABLE_ASSISTANT,
  type TableAssistantProps,
  type TableRuntime,
  TableRuntimePublisher,
  type TableRuntimeView,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
  undoRedoToolbarProps,
} from "@adapttable/core/binding";
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  shallowRef,
  toValue,
  type VNodeChild,
  watch,
} from "vue";

import {
  BULK_ACTIONS_CONTROL,
  BULK_ACTIONS_MODEL,
  COMMAND_PALETTE_CONTROL,
  COMMAND_PALETTE_MODEL,
  CONTEXT_MENU_CONTROL,
  CONTEXT_MENU_MODEL,
  EXPORT_CONTROL,
  EXPORT_MODEL,
  PRINT_CONTROL,
  PRINT_MODEL,
  SIDE_PANEL_CONTROL,
  SIDE_PANEL_MODEL,
  UNDO_REDO_CONTROL,
} from "./actions/contracts";
import type { SummaryRowFn } from "./aggregate/aggregate";
import { mergeVueAttrs, toVueAttrs } from "./attrs";
import { flattenColumns, type FooterContext } from "./columnDef";
import {
  COLUMN_HEADER_RENAME,
  columnMenuSlotKey,
} from "./columns/columnMenuContracts";
import type { TableEditingOptions } from "./editing/editingModels";
import { type FeatureLifecycle, useFeatureLifecycle } from "./featureLifecycle";
import {
  assertRequiredSlots,
  type ComposedFeature,
  type FeatureMountContext,
  featureOptionsOf,
  featureSlotFillsOf,
  normalizeFeatures,
  renderFeatureSlot,
} from "./features/tableFeature";
import { createFeatureState, provideFeatureState } from "./featureState";
import {
  groupingModelKey,
  rowDetailModelKey,
  treeModelKey,
} from "./hierarchy/models";
import { tableRowInventory } from "./hierarchy/rowInventory";
import { createFilterOptionCache } from "./layout/filterOptionCache";
import {
  batchEditBarSlotKey,
  COLUMN_RESIZE_MODEL,
  editableCellSlotKey,
  editHistoryModelKey,
  editingChromeModelKey,
  editingModelKey,
  filterViewKey,
  headerFilterModelKey,
  headerFilterSlotKey,
  type RowActionControlsProjector,
  rowActionsModelKey,
  rowEditActionsSlotKey,
  rowPinningModelKey,
  type TableBodyProjection,
  type TableBodyProjector,
} from "./layout/modelChannels";
import {
  type TableBodySlot,
  type TableRowModel,
  useDesktopTableModel,
  useMobileCardsModel,
} from "./layout/tableModels";
import {
  useSummaryCells,
  useTableSummaryModel,
} from "./layout/tableSummaryModel";
import {
  FILL_HANDLE_CONTROL,
  FIND_BUTTON,
  FIND_MODEL,
  GRID_ANNOUNCER,
  GRID_FOCUS_MODEL,
  SELECTION_STATS_MODEL,
} from "./navigation/contracts";
import { useRowSelection } from "./selection/selection";
import { useViewportMobile } from "./source/sourceLifecycle";
import {
  useFrontendData,
  type UseFrontendDataOptions,
} from "./source/useFrontendData";
import {
  bodyWindowModelKey,
  groupingPanelControlKey,
  groupingPanelModelKey,
  rowReorderControlKey,
  rowReorderModelKey,
} from "./specialized/contracts";
import { type MaybeRefOrGetterOptional, useScopeActivity } from "./store";
import { useDataTable, type UseDataTableOptions } from "./useDataTable";
import {
  DENSITY_CONTROL,
  FULLSCREEN_CONTROL,
  FULLSCREEN_MODEL,
  SAVED_VIEWS_CONTROL,
  SAVED_VIEWS_MODEL,
} from "./viewControls/contracts";
export interface DataTableSurface {
  scrollElement(): HTMLElement | null;
  rootElement?(): HTMLElement | null;
}
export interface DataTableHandle<TRow> {
  readonly runtime: TableRuntime<TRow>;
  readonly getView: () => TableRuntimeView<TRow> | undefined;
  focus(): void;
}
export interface UseDataTableShellOptions<TRow>
  extends
    Omit<UseDataTableOptions<TRow>, "source" | "selection">,
    Omit<
      UseFrontendDataOptions<TRow>,
      "data" | keyof UseDataTableOptions<TRow>
    > {
  readonly source?: MaybeRefOrGetterOptional<TableSource<TRow>>;
  readonly data?: MaybeRefOrGetter<readonly TRow[]>;
  readonly features?: MaybeRefOrGetterOptional<
    readonly ComposedFeature<NoInfer<TRow>>[]
  >;
  readonly assistant?: MaybeRefOrGetterOptional<
    TableAssistantProps<VNodeChild>
  >;
  /** Maps the current source row scope to rendered footer values. */
  readonly summaryRow?: SummaryRowFn<TRow>;
  /** Table-wide fallback for columns without a footer renderer. */
  readonly footer?: (context: FooterContext<TRow>) => VNodeChild;
  readonly confirm?: ConfirmHandler;
  readonly density?: MaybeRefOrGetterOptional<TableDensity>;
  readonly defaultDensity?: TableDensity;
  readonly onDensityChange?: (next: TableDensity) => void;
  readonly selectable?: MaybeRefOrGetter<boolean>;
  readonly selectedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultSelectedIds?: readonly string[];
  readonly onSelectionChange?: (ids: string[]) => void;
  readonly onCellPaste?: (edits: CellEdit<TRow>[]) => void;
  readonly onCellFill?: (edits: CellEdit<TRow>[]) => void;
  readonly onCellCut?: (range: CellRange) => void;
  readonly runtimeChannels?: MaybeRefOrGetter<
    Pick<
      RuntimeChromeInput<TRow>,
      | "filterDefs"
      | "filterRegistry"
      | "grouping"
      | "tree"
      | "editing"
      | "rowPinning"
    >
  >;
}
export interface ResolvedTableOptions<TRow>
  extends
    UseDataTableShellOptions<TRow>,
    Partial<
      Omit<
        TableEditingOptions<TRow>,
        "rows" | "columns" | "rowKey" | "featureHost"
      >
    > {
  readonly editingModel?: (
    context: FeatureMountContext<TRow>
  ) => void | (() => void);
  readonly bodyModel?: TableBodyProjector<TRow>;
  readonly filterEngine?: FilterEngine;
  readonly filters?: readonly FilterDef<TRow>[];
  readonly filterTypes?: readonly FilterTypeSpec[];
  readonly rowActionControls?: RowActionControlsProjector<TRow>;
  readonly undoRedoButtons?: boolean;
  readonly columnSelectionCheckbox?: boolean;
  readonly enableColumnMenu?: boolean;
  readonly statusBar?: boolean;
  readonly onCellRangeChange?: (range: CellRange | null) => void;
  readonly onCellCut?: (range: CellRange) => void;
  readonly onCellPaste?: (edits: CellEdit<TRow>[]) => void;
  readonly onCellFill?: (edits: CellEdit<TRow>[]) => void;
  readonly rowActions?: readonly RowAction<TRow>[];
  readonly bulkActions?: readonly BulkAction[];
  readonly [key: string]: unknown;
}
export function useDataTableShell<TRow>(
  input: MaybeRefOrGetter<UseDataTableShellOptions<TRow>>
) {
  const options = computed(() => toValue(input));
  const declarations = computed(() =>
    normalizeFeatures(toValue(options.value.features) ?? [])
  );
  const patches = computed(() => featureOptionsOf(declarations.value));
  const resolved = computed(() => {
    const featureValues = patches.value;
    const explicitValues = Object.fromEntries(
      Object.entries(options.value).filter(([, value]) => value !== undefined)
    );
    return {
      ...featureValues,
      ...explicitValues,
    } as unknown as ResolvedTableOptions<TRow>;
  });
  const localUrlAdapter = createMemoryAdapter();
  const urlAdapter = computed(() =>
    resolveUrlAdapter(
      toValue(resolved.value.urlAdapter),
      toValue(resolved.value.urlSync) ?? true,
      localUrlAdapter
    )
  );
  const root = shallowRef<HTMLElement | null>(null);
  const viewStateFlushers = new Set<() => void>();
  const flushViewState = (): void => {
    for (const flush of viewStateFlushers) flush();
  };
  const isMobile = useViewportMobile(resolved);
  const supplied = computed(() => toValue(resolved.value.source));
  const registered = shallowRef<FeatureHostState<TRow>>(
    EMPTY_FEATURE_HOST as unknown as FeatureHostState<TRow>
  );
  const filterOptionCache = createFilterOptionCache<TRow>();
  const filterRuntime = computed(() => {
    const engine = resolved.value.filterEngine;
    if (!engine) {
      filterOptionCache.clear();
      return undefined;
    }
    const columns = flattenColumns(toValue(resolved.value.columns)).leaves;
    const definitions = resolved.value.filters ?? [];
    return engine.buildRuntime({
      columns,
      declaredFilters: definitions,
      locale: toValue(resolved.value.locale),
      data:
        supplied.value?.allFilteredRows ?? toValue(resolved.value.data) ?? [],
      loadedOptions: {},
      filterTypes: resolved.value.filterTypes,
      featureHost: registered.value as FeatureHostState | undefined,
      optionCache: filterOptionCache.reconcile(columns, definitions),
    });
  });
  const filterRows = (row: TRow, extra: ExtraFilters): boolean =>
    (filterRuntime.value?.filterFn(row, extra) ?? true) &&
    (resolved.value.filterFn?.(row, extra) ?? true);
  const filterTree = (row: TRow, tree: QueryFilterGroup): boolean => {
    const filters = filterRuntime.value;
    const keep = filters
      ? (resolved.value.filterEngine?.evaluateTree(
          tree,
          row,
          filters.defs,
          filters.registry
        ) ?? true)
      : true;
    return keep && (resolved.value.filterTreeFn?.(row, tree) ?? true);
  };
  // A supplied source owns its state; the fallback never joins its URL namespace.
  const frontend = useFrontendData(() => ({
    ...resolved.value,
    forceMobile: isMobile,
    data: supplied.value ? [] : (toValue(resolved.value.data) ?? []),
    columns: flattenColumns(toValue(resolved.value.columns)).leaves,
    getRowId: resolved.value.rowKey,
    urlAdapter: supplied.value ? undefined : urlAdapter,
    urlSync: !supplied.value,
    filterFn: filterRuntime.value ? filterRows : resolved.value.filterFn,
    filterTreeFn: filterRuntime.value
      ? filterTree
      : resolved.value.filterTreeFn,
    filterKey: filterRuntime.value
      ? `${String(filterRuntime.value.filterKey)}:${String(toValue(resolved.value.filterKey) ?? "")}`
      : resolved.value.filterKey,
    arrayExtraKeys: [
      ...(toValue(resolved.value.arrayExtraKeys) ?? []),
      ...(filterRuntime.value?.arrayExtraKeys ?? []),
    ],
    numberExtraKeys: [
      ...(toValue(resolved.value.numberExtraKeys) ?? []),
      ...(filterRuntime.value?.numberExtraKeys ?? []),
    ],
  }));
  const source = computed(() => {
    const raw = supplied.value ?? frontend.value;
    const filters = filterRuntime.value;
    const engine = resolved.value.filterEngine;
    if (!filters || !engine || supplied.value || !raw.allSearchedRows)
      return raw;
    return {
      ...raw,
      facets: engine.computeFacets(
        filters.defs,
        raw.allSearchedRows,
        raw.extra,
        filterRows,
        filters.registry
      ),
    };
  });
  const state = createFeatureState();
  const grouping = state.get(groupingModelKey<TRow>());
  const tree = state.get(treeModelKey<TRow>());
  const detail = state.get(rowDetailModelKey<TRow>());
  const viewSource = computed(() =>
    grouping.value ? groupedViewSource(source.value) : source.value
  );
  const pinning = state.get(rowPinningModelKey<TRow>());
  const rowInventory = computed(() =>
    tableRowInventory({
      rows: viewSource.value.rows,
      rowKey: resolved.value.rowKey,
      grouping: grouping.value,
      tree: tree.value,
      pinning: pinning.value,
    })
  );
  const selectionEnabled = computed(
    () =>
      toValue(resolved.value.selectable) === true ||
      resolved.value.selectedIds !== undefined ||
      resolved.value.onSelectionChange !== undefined
  );
  const selectionState = useRowSelection(() => ({
    enabled: selectionEnabled,
    rows: rowInventory.value.visibleRows,
    rowKey: resolved.value.rowKey,
    selectedIds: resolved.value.selectedIds,
    defaultSelectedIds: resolved.value.defaultSelectedIds,
    onSelectionChange: resolved.value.onSelectionChange,
    labels: resolved.value.labels,
    acrossPages:
      source.value.capabilities?.fullDataset === true ||
      source.value.allFilteredRows !== undefined,
  }));
  const selection = computed(() =>
    selectionEnabled.value ? selectionState : undefined
  );
  const table = useDataTable(() => ({
    ...resolved.value,
    forceMobile: isMobile,
    source: viewSource,
    selection: selection.value,
  }));
  const editHistory = state.get(editHistoryModelKey<TRow>());
  const gridFocus = state.get(GRID_FOCUS_MODEL);
  const find = state.get(FIND_MODEL);
  const selectionStats = state.get(SELECTION_STATS_MODEL);
  const ownDensity = shallowRef(resolved.value.defaultDensity ?? "comfortable");
  const featureDensity = state.get(DENSITY_STATE);
  const density = computed(
    () =>
      toValue(resolved.value.density) ??
      featureDensity.value?.density ??
      ownDensity.value
  );
  const setDensity = (next: TableDensity): void => {
    if (!active.value) return;
    if (toValue(resolved.value.density) === undefined) {
      if (featureDensity.value) featureDensity.value.setDensity(next);
      else ownDensity.value = next;
    }
    resolved.value.onDensityChange?.(next);
  };
  const toolbarExtrasProps = computed((): ToolbarExtrasSlotProps => ({
    density: density.value,
    onDensityChange: setDensity,
    labels: table.labels.value,
    ...(editHistory.value
      ? undoRedoToolbarProps(
          resolved.value.undoRedoButtons,
          editHistory.value,
          table.labels.value
        )
      : {}),
  }));
  const fullscreen = state.get(FULLSCREEN_MODEL);
  const savedViewsState = state.get(SAVED_VIEWS_MODEL);
  const renderViewControls = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => {
    const presentation = {
      labels: table.labels.value,
      dir: table.dir.value,
      classNames,
      container: fullscreen.value?.container,
    };
    return [
      ...(featureDensity.value
        ? renderFeatureSlot(DENSITY_CONTROL, slotFills.value, {
            ...presentation,
            density: density.value,
            onDensityChange: setDensity,
          })
        : []),
      ...(fullscreen.value
        ? renderFeatureSlot(FULLSCREEN_CONTROL, slotFills.value, {
            ...presentation,
            fullscreen: fullscreen.value,
          })
        : []),
      ...(savedViewsState.value
        ? renderFeatureSlot(SAVED_VIEWS_CONTROL, slotFills.value, {
            ...presentation,
            savedViews: savedViewsState.value,
          })
        : []),
    ];
  };
  const renderToolbarExtras = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => [
    ...renderViewControls(classNames),
    ...renderActionToolbar(classNames),
    ...renderFeatureSlot(UNDO_REDO_CONTROL, slotFills.value, {
      ...toolbarExtrasProps.value,
      classNames,
    }),
    ...(resolved.value.enableColumnMenu
      ? renderFeatureSlot(columnMenuSlotKey<TRow>(), slotFills.value, {
          allColumns: table.allColumns.value,
          layout: table.layout.value,
          labels: table.labels.value,
          featureHost: registered.value,
          classNames,
          container: fullscreen.value?.container,
          dir: table.dir.value,
          hasRowActions: rowActions.value?.hasRowActions,
          hasRowReorder: resolved.value.rowReorder === true,
          onAutoSize: () => table.autoSizeColumns(root.value),
          onAutoSizeColumn: (key) => table.autoSizeColumn(root.value, key),
          onSortColumn: (key, dir) => source.value.setSort(key, dir),
          onRenameColumn: (key, name) => table.layout.value.setName(key, name),
          onFilterColumn: filterPanel.value?.openPanel
            ? () => filterPanel.value?.openPanel?.()
            : undefined,
          sortBy: table.sortBy.value,
          sortDir: table.sortDir.value,
        })
      : []),
    ...(find.value?.openBar
      ? renderFeatureSlot(FIND_BUTTON, slotFills.value, {
          label: table.labels.value.findInTable,
          onClick: find.value.openBar,
          className: classNames?.findButton,
        })
      : []),
    ...renderFeatureSlot(TOOLBAR_EXTRAS, slotFills.value, {
      ...toolbarExtrasProps.value,
      classNames,
    }),
  ];
  const publishedReorder = state.get(rowReorderModelKey<TRow>());
  const rowReorder = computed(() =>
    table.layout.value.isHidden(REORDER_COLUMN_KEY)
      ? undefined
      : publishedReorder.value
  );
  const bodyWindow = state.get(bodyWindowModelKey<TRow>());
  const groupingPanel = state.get(groupingPanelModelKey<TRow>());
  const renderGroupingPanel = () =>
    groupingPanel.value
      ? renderFeatureSlot(
          groupingPanelControlKey<TRow>(),
          slotFills.value,
          groupingPanel.value
        )
      : [];
  const bulkActions = state.get(BULK_ACTIONS_MODEL);
  const commandPalette = state.get(COMMAND_PALETTE_MODEL);
  const contextMenu = state.get(CONTEXT_MENU_MODEL);
  const exporting = state.get(EXPORT_MODEL);
  const printing = state.get(PRINT_MODEL);
  const sidePanel = state.get(SIDE_PANEL_MODEL);
  const actionPresentation = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => ({
    labels: table.labels.value,
    dir: table.dir.value,
    classNames,
    container: fullscreen.value?.container,
  });
  const renderActionToolbar = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => [
    ...(commandPalette.value
      ? renderFeatureSlot(COMMAND_PALETTE_CONTROL, slotFills.value, {
          ...actionPresentation(classNames),
          model: commandPalette.value,
        })
      : []),
    ...(exporting.value
      ? renderFeatureSlot(EXPORT_CONTROL, slotFills.value, {
          ...actionPresentation(classNames),
          model: exporting.value,
        })
      : []),
    ...(printing.value
      ? renderFeatureSlot(PRINT_CONTROL, slotFills.value, {
          ...actionPresentation(classNames),
          onPrint: printing.value,
        })
      : []),
  ];
  const renderBulkActions = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) =>
    bulkActions.value
      ? renderFeatureSlot(BULK_ACTIONS_CONTROL, slotFills.value, {
          ...actionPresentation(classNames),
          model: bulkActions.value,
        })
      : [];
  const renderActionOverlays = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) =>
    contextMenu.value
      ? renderFeatureSlot(CONTEXT_MENU_CONTROL, slotFills.value, {
          ...actionPresentation(classNames),
          model: contextMenu.value,
        })
      : [];
  const renderSidePanel = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) =>
    sidePanel.value
      ? renderFeatureSlot(SIDE_PANEL_CONTROL, slotFills.value, {
          ...actionPresentation(classNames),
          model: sidePanel.value,
        })
      : [];
  const editing = state.get(editingModelKey<TRow>());
  const editingChrome = state.get(editingChromeModelKey<TRow>());
  const approval = state.get(AGENT_APPROVAL_STATE);
  const renderAgentApproval = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) =>
    renderFeatureSlot(AGENT_APPROVAL, slotFills.value, {
      pending: approval.value,
      labels: table.labels.value,
      className: classNames?.agentApproval,
      buttonClassName: classNames?.agentApprovalButton,
    });
  const renderTableAssistant = () => {
    const assistant = toValue(resolved.value.assistant);
    if (!assistant) return [];
    if (!slotFills.value.get(TABLE_ASSISTANT.id)?.length)
      throw new Error(
        "AdaptTable: assistant requires tableAssistant() from this Vue kit’s assistant entry."
      );
    return renderFeatureSlot(TABLE_ASSISTANT, slotFills.value, {
      labels: table.labels.value,
      dir: table.dir.value,
      approval: approval.value,
      ...assistant,
    });
  };
  const renderBatchEditBar = () =>
    editingChrome.value?.batch
      ? renderFeatureSlot(
          batchEditBarSlotKey<TRow>(),
          slotFills.value,
          editingChrome.value.batch
        )
      : [];
  const rowActions = state.get(rowActionsModelKey<TRow>());
  const resize = state.get(COLUMN_RESIZE_MODEL);
  const headerFilters = state.get(headerFilterModelKey<TRow>());
  const filterPanel = state.get(filterViewKey<TRow>());
  const renderActiveFilterChips = () =>
    filterPanel.value?.chips?.length
      ? renderFeatureSlot(ACTIVE_FILTER_CHIPS, slotFills.value, {
          chips: filterPanel.value.chips,
          labels: table.labels.value,
          onClearAll: filterPanel.value.clear,
        })
      : [];
  const mergedActions = computed(() =>
    withRowPinActions({
      rowActions: rowActions.value?.rowActions,
      hasRowActions: rowActions.value?.hasRowActions ?? false,
      pinning: pinning.value !== undefined,
      pins: pinning.value?.actions ?? [],
      actionsHidden: table.layout.value.isHidden(ACTIONS_COLUMN_KEY),
    })
  );
  const baseDesktop = useDesktopTableModel(
    table,
    () => selection.value,
    () => toValue(resolved.value.fitColumns) ?? false,
    () => (detail.value ? table.labels.value.expandRow : undefined)
  );
  const baseMobile = useMobileCardsModel(table, baseDesktop);
  const rowEditControlsVisible = computed(
    () =>
      editingChrome.value?.row !== undefined &&
      !table.layout.value.isHidden(ACTIONS_COLUMN_KEY)
  );
  const actionsDesktop = computed(() => ({
    ...baseDesktop.value,
    reorderLabel: rowReorder.value ? table.labels.value.reorderRow : undefined,
    actionsLabel:
      mergedActions.value.rowActions || rowEditControlsVisible.value
        ? table.labels.value.actions
        : undefined,
    columnCount:
      baseDesktop.value.columnCount +
      (rowReorder.value ? 1 : 0) +
      (mergedActions.value.rowActions || rowEditControlsVisible.value ? 1 : 0),
  }));
  const body = computed<TableBodyProjection<TRow>>(
    () =>
      resolved.value.bodyModel?.({
        table,
        rowInventory: rowInventory.value,
        options: resolved.value,
        desktop: actionsDesktop.value,
        mobile: baseMobile.value,
        pinning: pinning.value,
        grouping: grouping.value,
        tree: tree.value,
        detail: detail.value,
        selection: selection.value,
      }) ?? { desktop: actionsDesktop.value, mobile: baseMobile.value }
  );
  const windowedBody = computed(
    () => bodyWindow.value?.projection ?? body.value
  );
  const bodyRows = computed(() =>
    body.value.desktop.bodySlots
      ? body.value.desktop.bodySlots.flatMap((slot) =>
          slot.kind === "row" && !slot.wiring.summary ? [slot.wiring] : []
        )
      : body.value.desktop.rows.filter((row) => !row.summary)
  );
  const bodyRowPositions = computed(
    () => new Map(bodyRows.value.map((row, index) => [row.key, index]))
  );
  const bodyColumnPositions = computed(
    () =>
      new Map(table.columns.value.map((column, index) => [column.key, index]))
  );
  const decorateNavigation = (
    row: TableRowModel<TRow>
  ): TableRowModel<TRow> => {
    if (row.summary || (!gridFocus.value && !find.value)) return row;
    const grid = gridFocus.value;
    const rowIndex = bodyRowPositions.value.get(row.key);
    if (rowIndex === undefined) return row;
    const absolute = table.windowStart.value + rowIndex;
    return {
      ...row,
      attrs: mergeVueAttrs(row.attrs, grid?.getRowProps(absolute) ?? {}),
      cells: row.cells.map((cell) => {
        const col = bodyColumnPositions.value.get(cell.key) ?? -1;
        const address = { row: absolute, col };
        const key = `${absolute}:${col}`;
        const current = find.value?.current;
        const marks = find.value?.open
          ? {
              "data-cell-match": find.value.matchKeys.has(key) ? "" : undefined,
              "data-cell-match-current":
                current?.row === absolute && current.col === col
                  ? ""
                  : undefined,
            }
          : {};
        return {
          ...cell,
          attrs: mergeVueAttrs(cell.attrs, {
            ...grid?.getCellProps(address),
            ...marks,
          }),
          addon: grid?.enabled
            ? (className?: string) =>
                renderFeatureSlot(FILL_HANDLE_CONTROL, slotFills.value, {
                  focus: grid,
                  windowIndex: rowIndex,
                  firstRowIndex: table.windowStart.value,
                  col,
                  className,
                })
            : undefined,
        };
      }),
    };
  };
  const renderNavigationBefore = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) =>
    find.value
      ? renderFeatureSlot(FIND_BAR, slotFills.value, {
          find: find.value,
          labels: table.labels.value,
          className: classNames?.findBar,
        })
      : [];
  const renderNavigationAfter = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => [
    ...renderFeatureSlot(STATUS_BAR, slotFills.value, {
      enabled: resolved.value.statusBar === true,
      shown: bodyRows.value.length,
      page: source.value.page,
      limit: source.value.limit,
      total: source.value.total,
      selected: selection.value?.selectedIds.value.size ?? 0,
      stats: selectionStats.value ?? null,
      labels: table.labels.value,
      locale: toValue(resolved.value.locale),
      className: classNames?.statusBar,
    }),
    ...(gridFocus.value
      ? renderFeatureSlot(GRID_ANNOUNCER, slotFills.value, {
          focus: gridFocus.value,
          className: classNames?.gridAnnouncer,
        })
      : []),
  ];
  const requestConfirm: ConfirmHandler = (request) => {
    const confirm = resolved.value.confirm;
    if (!confirm)
      throw new Error(
        "AdaptTable: confirming a row action requires the adapter's confirm control."
      );
    confirm(request);
  };
  const visibleRowObjects = computed(
    () => new Set(rowInventory.value.visibleRows)
  );
  const rowOwnerRevision = shallowRef(0);
  const rowSourceOwner = () =>
    source.value.tableEngine ??
    source.value.setPage ??
    supplied.value ??
    source.value;
  const rowControlOwner = (row: TRow) => {
    const owner = rowSourceOwner();
    const revision = rowOwnerRevision.value;
    return () =>
      active.value &&
      rowOwnerRevision.value === revision &&
      rowSourceOwner() === owner &&
      visibleRowObjects.value.has(row);
  };
  const decorateRow = (original: TableRowModel<TRow>): TableRowModel<TRow> => {
    const ownsRow =
      original.detail || resolved.value.rowActionControls
        ? rowControlOwner(original.row)
        : undefined;
    const rowDetail = original.detail;
    if (rowDetail) {
      const toggle = rowDetail.toggleAttrs.onClick;
      original = {
        ...original,
        detail: {
          ...rowDetail,
          toggleAttrs: {
            ...rowDetail.toggleAttrs,
            onClick: (event: Event) => {
              if (ownsRow?.() && typeof toggle === "function")
                (toggle as (event: Event) => void)(event);
            },
          },
        },
      };
    }
    const reorder = rowReorder.value;
    if (reorder && !original.summary) {
      const localIndex = rowInventory.value.visibleRows.findIndex(
        (row) => table.rowKey(row) === original.key
      );
      const model = original;
      original = {
        ...model,
        attrs: {
          ...model.attrs,
          ...reorder.rowAttrs(
            model.key,
            localIndex,
            model.row,
            table.windowStart.value
          ),
        },
        reorder: (mobile) =>
          renderFeatureSlot(rowReorderControlKey<TRow>(), slotFills.value, {
            model: reorder,
            labels: table.labels.value,
            row: model.row,
            rowId: model.key,
            localIndex,
            windowStart: table.windowStart.value,
            rowCount: rowInventory.value.visibleRows.length,
            mobile,
          }),
      };
    }
    const projector = resolved.value.rowActionControls;
    const rowEditing =
      !original.summary && rowEditControlsVisible.value
        ? editingChrome.value?.row?.(
            original.row,
            original.key,
            mergedActions.value.rowActions
          )
        : undefined;
    const actions = rowEditing?.actions ?? mergedActions.value.rowActions;
    const controls =
      !original.summary && projector && actions
        ? projector({
            row: original.row,
            actions,
            confirm: requestConfirm,
            cancelLabel: table.labels.value.cancel,
            enabled: () =>
              ownsRow?.() === true &&
              resolved.value.rowActionControls === projector,
          })
        : undefined;
    const row =
      controls || rowEditing
        ? {
            ...original,
            actionControls: controls,
            editActions: rowEditing
              ? () =>
                  renderFeatureSlot(
                    rowEditActionsSlotKey<TRow>(),
                    slotFills.value,
                    rowEditing.props
                  )
              : undefined,
          }
        : original;
    if (!editing.value || row.summary) return row;
    return {
      ...row,
      cells: row.cells.map((cell) =>
        !isCellEditable(cell.context.column, row.row)
          ? cell
          : {
              ...cell,
              render: (display) =>
                renderFeatureSlot(
                  editableCellSlotKey<TRow>(),
                  slotFills.value,
                  {
                    editing: editing.value,
                    row: row.row,
                    rowId: row.key,
                    rowIndex: row.index,
                    column: cell.context.column,
                    rows: rowInventory.value.visibleRows,
                    columns: table.columns.value,
                    rowKey: table.rowKey,
                    editLabel: table.labels.value.editCell,
                    undoLabel: table.labels.value.undoEdit,
                    display,
                  }
                ),
            }
      ),
    };
  };
  const decorateSlots = (slots: readonly TableBodySlot<TRow>[] | undefined) =>
    slots?.map((slot) =>
      slot.kind === "row"
        ? { ...slot, wiring: decorateNavigation(decorateRow(slot.wiring)) }
        : slot
    );
  const renameColumn = (key: string, name: string): void =>
    table.layout.value.setName(key, name);
  const columnToggle = (col: number) => () =>
    gridFocus.value?.toggleColumn(col);
  const summaryCells = useSummaryCells(
    () => table.source.value.rows,
    () => resolved.value.summaryRow
  );
  const desktopSummary = useTableSummaryModel(
    table,
    () => windowedBody.value.desktop.headers.map((header) => header.column),
    () => summaryCells.value,
    () => resolved.value.footer !== undefined
  );
  const mobileSummary = useTableSummaryModel(
    table,
    () => table.columns.value,
    () => summaryCells.value,
    () => resolved.value.footer !== undefined
  );
  const desktop = computed(() => ({
    ...windowedBody.value.desktop,
    summary: desktopSummary.value,
    attrs: mergeVueAttrs(
      windowedBody.value.desktop.attrs,
      gridFocus.value?.getGridProps() ?? {}
    ),
    headers: windowedBody.value.desktop.headers.map((header) => {
      const col = bodyColumnPositions.value.get(header.key) ?? -1;
      return {
        ...header,
        attrs: mergeVueAttrs(
          mergeVueAttrs(
            header.attrs,
            toVueAttrs({
              ...groupingPanel.value?.state.headerDragProps(header.key),
            })
          ),
          gridFocus.value?.getColumnHeaderProps(col, {
            sortable: header.column.sortable,
          }) ?? {}
        ),
        selection: gridFocus.value?.columnCheckbox
          ? (className?: string) =>
              renderFeatureSlot(COLUMN_SELECT, slotFills.value, {
                label: `${table.labels.value.selectColumn}: ${header.context.label}`,
                checked: gridFocus.value?.isColumnSelected(col) ?? false,
                onToggle: columnToggle(col),
                className,
              })
          : undefined,
        rename:
          resolved.value.enableColumnMenu && header.column.renameable
            ? (
                children: VNodeChild,
                classNames?: Readonly<Record<string, string | undefined>>
              ) =>
                renderFeatureSlot(COLUMN_HEADER_RENAME, slotFills.value, {
                  columnKey: header.key,
                  name: header.context.label,
                  labels: table.labels.value,
                  onRenameColumn: renameColumn,
                  children,
                  classNames,
                })
            : undefined,

        filter: headerFilters.value?.controls.has(header.key)
          ? (className?: string) => {
              const props = headerFilters.value?.controls.get(header.key);
              return props
                ? renderFeatureSlot(
                    headerFilterSlotKey<TRow>(),
                    slotFills.value,
                    { ...props, className }
                  )
                : null;
            }
          : undefined,
        resizeAttrs: resize.value?.attrs(
          header.key,
          `${table.labels.value.resizeColumn}: ${header.context.label}`
        ),
      };
    }),
    rows: windowedBody.value.desktop.rows.map((row) =>
      decorateNavigation(decorateRow(row))
    ),
    bodySlots: decorateSlots(windowedBody.value.desktop.bodySlots),
  }));
  const mobile = computed(() => ({
    ...windowedBody.value.mobile,
    summary: mobileSummary.value,
    rows: windowedBody.value.mobile.rows.map((row) =>
      decorateNavigation(decorateRow(row))
    ),
    bodySlots: decorateSlots(windowedBody.value.mobile.bodySlots),
  }));
  if (getCurrentInstance()) provideFeatureState(state);
  const active = useScopeActivity();
  watch(
    [() => active.value, rowSourceOwner],
    ([live, owner], [, previousOwner]) => {
      if (!live || owner !== previousOwner) rowOwnerRevision.value++;
    },
    { flush: "sync" }
  );
  // Keep this projection total after Vue captures a required-slot error from
  // reconciliation. A throwing computed can cache undefined and mask that
  // contract error on the error boundary's next render.
  const slotFills = computed(() => featureSlotFillsOf(declarations.value));
  let publisher = new TableRuntimePublisher<TRow>();
  let publishedEngine: TableSource<TRow>["tableEngine"];
  let disposed = false;
  let currentView: TableRuntimeView<TRow> | undefined;
  const frame = computed((): RuntimeChromeInput<TRow> => ({
    source: viewSource.value,
    getRowId: table.rowKey,
    allColumns: table.allColumns.value,
    columnLayout: table.layout.value,
    columnLayoutLive: true,
    grouping: grouping.value,
    tree: tree.value,
    rowPinning: pinning.value,
    editing: editing.value,
    filterDefs: filterRuntime.value?.defs,
    filterRegistry: filterRuntime.value?.registry,
    table: {
      labels: table.labels.value,
      selection: selection.value
        ? {
            selectedIds: selection.value.selectedIds.value,
            allMatching: selection.value.state.value.allMatching,
            acrossPages: selection.value.state.value.acrossPages,
            replace: selection.value.replace,
          }
        : undefined,
    },
    ...toValue(resolved.value.runtimeChannels),
  }));
  const publish = (): TableRuntimeView<TRow> | undefined => {
    if (disposed) return undefined;
    const chrome = frame.value;
    if (chrome.source.tableEngine !== publishedEngine) {
      publisher = new TableRuntimePublisher<TRow>();
      publishedEngine = chrome.source.tableEngine;
    }
    currentView = publisher.update(chrome, {
      rowActions: rowActions.value?.hostActions,
      bulkActions: resolved.value.bulkActions,
    });
    return currentView;
  };
  const runtime: TableRuntime<TRow> = {
    rowAt: (index) => {
      const view = publish();
      return (view?.visibleRows ?? view?.rows)?.[index];
    },
    labels: () => table.labels.value,
    view: publish,
    featureIds: () =>
      disposed ? [] : declarations.value.map((feature) => feature.id),
  };
  const lifecycleOwner = getCurrentScope();
  let editingLifecycle: FeatureLifecycle<TRow> | undefined;
  let reconciling = false;
  const reconcile = (): void => {
    if (reconciling || disposed) return;
    reconciling = true;
    try {
      assertRequiredSlots(declarations.value, slotFills.value);
      publish();
      lifecycle.reconcile(declarations.value);
      const model = resolved.value.editingModel;
      if (model) {
        editingLifecycle ??= lifecycleOwner?.run(() =>
          useFeatureLifecycle(lifecycleInput)
        );
        editingLifecycle?.reconcile([{ id: "editing-model", mount: model }]);
      } else editingLifecycle?.reconcile([]);
      publish();
    } finally {
      reconciling = false;
    }
  };
  const lifecycleInput = {
    selection,
    bodyRows,
    scrollToRow: (index: number) => {
      const row = bodyRows.value[index - table.windowStart.value];
      if (row) bodyWindow.value?.scrollToRow(row.key);
    },
    scrollToColumn: (index: number) => {
      const column = table.columns.value[index];
      if (column) bodyWindow.value?.scrollToColumn(column.key);
    },
    runtime,
    bodyProjection: body,
    root,
    urlAdapter,
    flushViewState,
    registerViewStateFlush: (flush: () => void) => {
      viewStateFlushers.add(flush);
      return () => {
        viewStateFlushers.delete(flush);
      };
    },
    source,
    density,
    table,
    rowInventory,
    options: resolved,
    filterRuntime,
    featureHost: registered,
    state,
    active,
    reconcile,
    flushAdmission: async () => {
      await nextTick();
      if (active.value) reconcile();
    },
  };
  const lifecycle = useFeatureLifecycle(lifecycleInput);
  watch(
    lifecycle.host,
    (value) => {
      registered.value = value;
    },
    { immediate: true, flush: "sync" }
  );
  watch([declarations, frame], reconcile, { immediate: true, flush: "sync" });
  const surface = shallowRef<DataTableSurface | null>(null);
  const handle: DataTableHandle<TRow> = {
    runtime,
    getView: publish,
    focus: () => {
      surface.value?.scrollElement()?.focus();
    },
  };
  onScopeDispose(() => {
    disposed = true;
    currentView = undefined;
    surface.value = null;
  });
  return {
    table,
    rowInventory,
    source,
    selection,
    desktop,
    mobile,
    bodyProjection: body,
    bodyWindow,
    rowReorder,
    state,
    active,
    features: declarations,
    featureHost: lifecycle.host,
    rowActions,
    grouping,
    tree,
    detail,
    editing,
    filterRuntime,
    featureOptions: patches,
    density,
    setDensity,
    fullscreen,
    savedViews: savedViewsState,
    urlAdapter,
    flushViewState,
    toolbarExtrasProps,
    renderToolbarExtras,
    renderActiveFilterChips,
    renderBatchEditBar,
    renderAgentApproval,
    renderTableAssistant,
    renderNavigationBefore,
    renderNavigationAfter,
    gridFocus,
    find,
    selectionStats,
    bodyRows,
    hasActionToolbar: computed(() =>
      [
        commandPalette.value?.button,
        commandPalette.value?.open,
        exporting.value?.onExportCsv,
        printing.value,
        toolbarExtrasProps.value.onUndo,
        toolbarExtrasProps.value.onRedo,
      ].some(Boolean)
    ),
    renderBulkActions,
    renderActionOverlays,
    renderSidePanel,
    sidePanel,
    renderGroupingPanel,
    groupingPanel,
    slotFills,
    runtime,
    handle,
    reconcile,
    setSurface: (next: DataTableSurface | null): void => {
      surface.value = next;
      root.value = next?.rootElement?.() ?? null;
    },
  };
}
export type UseDataTableShellResult<TRow> = ReturnType<
  typeof useDataTableShell<TRow>
>;
