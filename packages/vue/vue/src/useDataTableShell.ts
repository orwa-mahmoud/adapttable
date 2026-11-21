import {
  ACTIONS_COLUMN_KEY,
  type ConfirmHandler,
  createMemoryAdapter,
  REORDER_COLUMN_KEY,
  type RowAction,
  stableKey,
  type TableDensity,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  COLUMN_SELECT,
  columnSelectLabel,
  createTableStore,
  DENSITY_STATE,
  type FeatureHostState,
  featureLabelsOf,
  filterTreeSnapshot,
  FIND_BAR,
  LiveFeatureHost,
  overlayFeatureOptions,
  projectedGroupingSource,
  resolveUrlAdapter,
  type RuntimeChromeInput,
  sameFilterTree,
  STATUS_BAR,
  TABLE_ASSISTANT,
  type TableRuntime,
  TableRuntimePublisher,
  type TableRuntimeView,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
  undoRedoToolbarProps,
  withRowPinActions,
} from "@adapttable/core/binding";
import { type EditingBundle, isCellEditable } from "@adapttable/core/editing";
import {
  computed,
  type ComputedRef,
  getCurrentInstance,
  getCurrentScope,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  provide,
  shallowRef,
  toValue,
  type VNodeChild,
  watch,
} from "vue";

import { mountForcedColorsStyles } from "./a11y/forcedColors";
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
import { mergeVueAttrs, toVueAttrs } from "./attrs";
import {
  COLUMN_HEADER_RENAME,
  columnMenuSlotKey,
} from "./columns/columnMenuContracts";
import { drawnRowEditing, sameDrawnView } from "./editing/editableUnitModel";
import { type FeatureLifecycle, useFeatureLifecycle } from "./featureLifecycle";
import {
  assertRequiredSlots,
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
  rowActionsModelKey,
  rowEditActionsSlotKey,
  rowPinningModelKey,
  type TableBodyProjection,
} from "./layout/modelChannels";
import {
  keptAttrs,
  lazyCells,
  sameAttrs,
  type TableBodySlot,
  type TableCellModel,
  type TableRowModel,
  useDesktopTableModel,
  useMobileCardsModel,
} from "./layout/tableModels";
import {
  useSummaryCells,
  useTableSummaryModel,
} from "./layout/tableSummaryModel";
import { useMountStagger } from "./motion/useMountStagger";
import {
  FILL_HANDLE_CONTROL,
  FIND_BUTTON,
  FIND_MODEL,
  GRID_ANNOUNCER,
  GRID_FOCUS_MODEL,
  SELECTION_STATS_MODEL,
} from "./navigation/contracts";
import { withLiveSelection } from "./rows/liveRowState";
import { useRowSelection } from "./selection/selection";
import type {
  DataTableHandle,
  DataTableSurface,
  ResolvedTableOptions,
  UseDataTableShellOptions,
} from "./shell/shellContract";
import { useShellDataTier } from "./shell/shellDataTier";
import { useViewportMobile } from "./source/sourceLifecycle";
import {
  bodyWindowModelKey,
  groupingPanelControlKey,
  groupingPanelModelKey,
  rowReorderControlKey,
  rowReorderModelKey,
} from "./specialized/contracts";
import { useOptionFields, useScopeActivity } from "./store";
import { TABLE_STORE } from "./tableStore";
import { useDataTable } from "./useDataTable";
import {
  DENSITY_CONTROL,
  FULLSCREEN_CONTROL,
  FULLSCREEN_MODEL,
  SAVED_VIEWS_CONTROL,
  SAVED_VIEWS_MODEL,
} from "./viewControls/contracts";
export type {
  DataTableHandle,
  DataTableSurface,
  ResolvedTableOptions,
  UseDataTableShellOptions,
} from "./shell/shellContract";
/**
 * A row model with fields added or replaced. The row's own getters stay
 * getters, so what it reads lazily is still read when it is drawn; `getters`
 * add fields of that kind.
 */
function withRowFields<TRow>(
  row: TableRowModel<TRow>,
  fields: Partial<TableRowModel<TRow>>,
  getters: Readonly<Record<string, () => unknown>> = {}
): TableRowModel<TRow> {
  const descriptors: PropertyDescriptorMap = {
    ...Object.getOwnPropertyDescriptors(row),
  };
  for (const [key, value] of Object.entries(fields))
    descriptors[key] = { value, enumerable: true, configurable: true };
  for (const [key, get] of Object.entries(getters))
    descriptors[key] = { get, enumerable: true, configurable: true };
  return Object.defineProperties({}, descriptors) as TableRowModel<TRow>;
}

/**
 * Whether two navigation cell lists draw the same: each cell's own fields are
 * the same, its attributes have the same entries, and it has a fill handle in
 * both or neither (the handle reads the current focus when drawn).
 */
function sameNavigationCells<TRow>(
  previous: readonly TableCellModel<TRow>[],
  next: readonly TableCellModel<TRow>[]
): boolean {
  return (
    previous.length === next.length &&
    next.every((cell, index) => {
      const before = previous[index]!;
      return (
        cell.key === before.key &&
        cell.context === before.context &&
        cell.render === before.render &&
        (cell.addon === undefined) === (before.addon === undefined) &&
        sameAttrs(before.attrs, cell.attrs)
      );
    })
  );
}

/** Whether a value can key a weak map. */
function isKeyable(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/** An array that reads `current` each time it is used, for a stable prop. */
function liveArray<T>(current: () => readonly T[]): readonly T[] {
  return new Proxy([] as T[], {
    get: (_target, key): unknown => Reflect.get(current(), key) as unknown,
    has: (_target, key) => Reflect.has(current(), key),
  });
}

/** Every field of an editing bundle, for a view that reads the current one. */
const EDITING_BUNDLE_FIELDS = [
  "onCellEdit",
  "state",
  "validation",
  "saving",
  "dirty",
  "rowEditing",
  "batch",
  "lifecycle",
  "conflict",
  "conflictLabels",
  "featureHost",
  "activation",
] as const satisfies readonly (keyof EditingBundle<unknown>)[];

/** A bundle whose every field is read from `current` when it is used. */
function liveEditingBundle<TRow>(
  current: () => EditingBundle<TRow> | undefined
): EditingBundle<TRow> {
  const view = {} as EditingBundle<TRow>;
  for (const field of EDITING_BUNDLE_FIELDS) {
    Object.defineProperty(view, field, {
      enumerable: true,
      get: () => current()?.[field],
    });
  }
  return view;
}

/** One source, feature lifecycle and model composition shared by every Vue kit. */

export function useDataTableShell<TRow>(
  input: MaybeRefOrGetter<UseDataTableShellOptions<TRow>>
) {
  mountForcedColorsStyles();
  const options = computed(() => toValue(input));
  // The features are composed when the host's features change, not each
  // time another option (the data) does: their slot fills reach every row.
  const featureList = computed(() => toValue(options.value.features));
  const declarations = computed(() =>
    normalizeFeatures(featureList.value ?? [])
  );
  const patches = computed(() => featureOptionsOf(declarations.value));
  // Read option by option: a change to one option reaches its readers only.
  const resolved = useOptionFields(() =>
    overlayFeatureOptions<
      UseDataTableShellOptions<TRow>,
      ResolvedTableOptions<TRow>
    >(patches.value, featureLabelsOf(declarations.value), options.value)
  );
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
    new LiveFeatureHost<TRow>()
  );
  // One store per table: its view state, column layout, expansion and row
  // pinning are its slices. What this setup calls gets it passed; the
  // components inside the table inject it.
  const tableStore = createTableStore();
  provide(TABLE_STORE, tableStore);
  const { filterRuntime, source } = useShellDataTier<TRow>(
    resolved,
    declarations,
    registered,
    supplied,
    urlAdapter,
    isMobile,
    tableStore
  );
  const state = createFeatureState();
  const grouping = state.get(groupingModelKey<TRow>());
  const tree = state.get(treeModelKey<TRow>());
  const detail = state.get(rowDetailModelKey<TRow>());
  const viewSource = computed(() =>
    projectedGroupingSource(source.value, { model: grouping.value })
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
    store: tableStore,
    forceMobile: isMobile,
    source: viewSource,
    selection: selection.value,
    stickyTop: resolved.value.maxHeight != null ? 0 : resolved.value.stickyTop,
  }));
  watch(
    () => {
      const current = source.value;
      return {
        key: stableKey([current.search, current.extra, current.groupBy]),
        tree: current.filterTree,
        snapshot: current.filterTree
          ? filterTreeSnapshot(current.filterTree)
          : undefined,
        selectedIds: toValue(resolved.value.selectedIds),
      };
    },
    (current, previous) => {
      const sameTree = current.tree
        ? sameFilterTree(current.tree, previous.snapshot)
        : previous.snapshot === undefined;
      if (current.key === previous.key && sameTree) return;
      // An explicit host selection arriving with a restored query owns that
      // scope. Ordinary query edits keep the same controlled value until reset.
      if (
        current.selectedIds !== undefined &&
        current.selectedIds !== previous.selectedIds
      )
        return;
      // Query changes start a new selection scope; page and sort changes do not.
      if (
        selectionState.selectedCount.value > 0 ||
        selectionState.allMatching.value
      )
        selectionState.clear();
    },
    { flush: "post" }
  );
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
    return {
      savedViews: savedViewsState.value
        ? renderFeatureSlot(SAVED_VIEWS_CONTROL, slotFills.value, {
            ...presentation,
            savedViews: savedViewsState.value,
          })
        : [],
      display: [
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
      ],
    };
  };
  /**
   * The toolbar's controls in the order every binding draws them: the
   * filters, saved views and columns first, then undo and redo, find, the
   * display controls and the actions that export, print or open the
   * palette.
   */
  const renderToolbarExtras = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => {
    const view = renderViewControls(classNames);
    return [
      ...renderFeatureSlot(TOOLBAR_EXTRAS, slotFills.value, {
        ...toolbarExtrasProps.value,
        classNames,
      }),
      ...view.savedViews,
      ...renderColumnMenu(classNames),
      ...renderFeatureSlot(UNDO_REDO_CONTROL, slotFills.value, {
        ...toolbarExtrasProps.value,
        classNames,
      }),
      ...(find.value?.openBar
        ? renderFeatureSlot(FIND_BUTTON, slotFills.value, {
            label: table.labels.value.findInTable,
            onClick: find.value.openBar,
            className: classNames?.findButton,
          })
        : []),
      ...view.display,
      ...renderActionToolbar(classNames),
    ];
  };
  const renderColumnMenu = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) => [
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
  // The card projection is read on demand: a table drawing desktop rows
  // never builds it, and one drawing cards builds it when it reads `mobile`.
  const body = computed<TableBodyProjection<TRow>>(
    () =>
      resolved.value.bodyModel?.({
        table,
        rowInventory: rowInventory.value,
        options: resolved.value,
        desktop: actionsDesktop.value,
        get mobile() {
          return baseMobile.value;
        },
        pinning: pinning.value,
        grouping: grouping.value,
        tree: tree.value,
        detail: detail.value,
        selection: selection.value,
      }) ?? {
        desktop: actionsDesktop.value,
        get mobile() {
          return baseMobile.value;
        },
      }
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
  // What row decoration reads, narrowed to the value it uses: the options
  // object is rebuilt with every data change, and the positions map with
  // every row change, while each row's own value usually stays the same.
  const rowActionControls = computed(() => resolved.value.rowActionControls);
  const positions = new Map<string, ComputedRef<number | undefined>>();
  const columnPositions = new Map<string, ComputedRef<number>>();
  const columnPosition = (key: string): number => {
    let position = columnPositions.get(key);
    if (!position) {
      position = computed(() => bodyColumnPositions.value.get(key) ?? -1);
      columnPositions.set(key, position);
    }
    return position.value;
  };
  const rowPosition = (key: string): number | undefined => {
    let position = positions.get(key);
    if (!position) {
      position = computed(() => bodyRowPositions.value.get(key));
      positions.set(key, position);
    }
    return position.value;
  };
  // Navigation decorates rows while cell navigation or find is on; the focus
  // and matches a row shows are read when the row is drawn, and kept while
  // they are the same, so a focus move redraws the rows it moves between.
  const navigationOn = computed(
    () => gridFocus.value !== undefined || find.value !== undefined
  );
  const navigationCell = (
    cell: TableCellModel<TRow>,
    rowIndex: number,
    absolute: number
  ): TableCellModel<TRow> => {
    const col = columnPosition(cell.key);
    const key = `${absolute}:${col}`;
    const search = find.value;
    const current = search?.current;
    const marks = search?.open
      ? {
          "data-cell-match": search.matchKeys.has(key) ? "" : undefined,
          "data-cell-match-current":
            current?.row === absolute && current.col === col ? "" : undefined,
        }
      : {};
    const attrs = mergeVueAttrs(cell.attrs, {
      ...gridFocus.value?.getCellProps({ row: absolute, col }),
      ...marks,
    });
    return {
      ...cell,
      attrs,
      addon: gridFocus.value?.enabled
        ? (className?: string) =>
            renderFeatureSlot(FILL_HANDLE_CONTROL, slotFills.value, {
              focus: gridFocus.value!,
              windowIndex: rowIndex,
              firstRowIndex: table.windowStart.value,
              col,
              className,
            })
        : undefined,
    };
  };
  const decorateNavigation = (
    row: TableRowModel<TRow>
  ): TableRowModel<TRow> => {
    if (row.summary || !navigationOn.value) return row;
    const rowIndex = rowPosition(row.key);
    if (rowIndex === undefined) return row;
    const absolute = table.windowStart.value + rowIndex;
    const attrs = keptAttrs(() =>
      mergeVueAttrs(row.attrs, gridFocus.value?.getRowProps(absolute) ?? {})
    );
    const cells = computed<readonly TableCellModel<TRow>[]>((previous) => {
      const next = row.cells.map((cell) =>
        navigationCell(cell, rowIndex, absolute)
      );
      return previous && sameNavigationCells(previous, next) ? previous : next;
    });
    return withRowFields(
      row,
      {},
      {
        attrs: () => attrs.value,
        cells: () => cells.value,
      }
    );
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
      // The footer already prints this range. Blanking it keeps the two from repeating.
      labels: table.showFooter.value
        ? { ...table.labels.value, showing: () => "" }
        : table.labels.value,
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
  // The owner, not the source it is read from: the source is a new object
  // with each data change while its owner usually stays the same.
  const sourceOwner = computed(rowSourceOwner);
  // Whether one row is still drawn, as its own value: the set of drawn rows is
  // rebuilt with each data change.
  const visibility = new WeakMap<object, ComputedRef<boolean>>();
  const rowVisible = (row: TRow): ComputedRef<boolean> => {
    if (!isKeyable(row))
      return computed(() => visibleRowObjects.value.has(row));
    let visible = visibility.get(row);
    if (!visible) {
      visible = computed(() => visibleRowObjects.value.has(row));
      visibility.set(row, visible);
    }
    return visible;
  };
  const rowControlOwner = (row: TRow) => {
    const owner = sourceOwner.value;
    const revision = rowOwnerRevision.value;
    const visible = rowVisible(row);
    return () =>
      active.value &&
      rowOwnerRevision.value === revision &&
      sourceOwner.value === owner &&
      visible.value;
  };
  // A row reads editing through what changes it: whether editing is on, and
  // a view of the bundle that is replaced only when what the row's cells draw
  // (`drawnRowEditing`) changes. The view reads the current bundle, so a row's
  // actions always act on the latest state, while an edit redraws only the
  // rows it changes.
  const editingOn = computed(() => editing.value !== undefined);
  const rowEditFactory = computed(() => editingChrome.value?.row);
  let latestBundle = editing.value;
  watch(
    editing,
    (bundle) => {
      latestBundle = bundle;
    },
    { flush: "sync" }
  );
  const currentBundle = (): EditingBundle<TRow> | undefined => latestBundle;
  // The drawn rows an editor reads when it moves on (Tab, Enter): read then,
  // so drawing a row does not depend on every other row's data.
  let latestVisibleRows = rowInventory.value.visibleRows;
  watch(
    () => rowInventory.value.visibleRows,
    (rows) => {
      latestVisibleRows = rows;
    },
    { flush: "sync" }
  );
  const liveVisibleRows = liveArray(() => latestVisibleRows);
  const rowTargets = new Map<string, TRow>();
  /** The editing view a row's edit controls draw with. */
  const rowEditingView = (
    model: TableRowModel<TRow>
  ): EditingBundle<TRow> | undefined => {
    rowTargets.set(model.key, model.row);
    return bundleFor(model.key);
  };
  const rowBundles = new Map<
    string,
    ComputedRef<EditingBundle<TRow> | undefined>
  >();
  const bundleFor = (rowId: string): EditingBundle<TRow> | undefined => {
    let view = rowBundles.get(rowId);
    if (!view) {
      let drawn: readonly unknown[] | undefined;
      view = computed<EditingBundle<TRow> | undefined>((previous) => {
        const next = editing.value;
        const row = rowTargets.get(rowId);
        const current =
          next && row !== undefined
            ? drawnRowEditing(next, {
                row,
                rowId,
                rows: rowInventory.value.visibleRows,
                columns: table.columns.value,
                rowKey: table.rowKey,
              })
            : undefined;
        if (previous && drawn && current && sameDrawnView(drawn, current))
          return previous;
        drawn = current;
        return next && liveEditingBundle(currentBundle);
      });
      rowBundles.set(rowId, view);
    }
    return view.value;
  };
  // A row that leaves the drawn rows leaves its bundle and position behind.
  watch(
    () => rowInventory.value.visibleRows,
    (rows) => {
      const drawn = new Set(rows.map(table.rowKey));
      for (const rowId of rowBundles.keys()) {
        if (drawn.has(rowId)) continue;
        rowBundles.delete(rowId);
        rowTargets.delete(rowId);
      }
      for (const rowId of positions.keys()) {
        if (!drawn.has(rowId)) positions.delete(rowId);
      }
    }
  );
  /** A cell that edits in place, drawn through the kit's editable cell. */
  const editableCell = (
    row: TableRowModel<TRow>,
    cell: TableCellModel<TRow>
  ): TableCellModel<TRow> =>
    isCellEditable(cell.context.column, row.row)
      ? {
          ...cell,
          render: (display) =>
            renderFeatureSlot(editableCellSlotKey<TRow>(), slotFills.value, {
              editing: bundleFor(row.key),
              row: row.row,
              rowId: row.key,
              rowIndex: row.index,
              column: cell.context.column,
              rows: liveVisibleRows,
              columns: table.columns.value,
              rowKey: table.rowKey,
              editLabel: table.labels.value.editCell,
              undoLabel: table.labels.value.undoEdit,
              display,
            }),
        }
      : cell;
  const decorateRow = (original: TableRowModel<TRow>): TableRowModel<TRow> => {
    const ownsRow =
      original.detail || rowActionControls.value
        ? rowControlOwner(original.row)
        : undefined;
    const rowDetail = original.detail;
    if (rowDetail) {
      const toggle = rowDetail.toggleAttrs.onClick;
      original = withRowFields(original, {
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
      });
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
    const projector = rowActionControls.value;
    const rowEditing =
      !original.summary && rowEditControlsVisible.value
        ? rowEditFactory.value?.(
            original.row,
            original.key,
            rowActionList.value,
            rowEditingView(original)
          )
        : undefined;
    const actions = rowEditing?.actions ?? rowActionList.value;
    const controls =
      !original.summary && projector && actions
        ? projector({
            row: original.row,
            actions,
            confirm: requestConfirm,
            cancelLabel: table.labels.value.cancel,
            enabled: () =>
              ownsRow?.() === true && rowActionControls.value === projector,
          })
        : undefined;
    const row =
      controls || rowEditing
        ? withRowFields(original, {
            actionControls: controls,
            editActions: rowEditing
              ? () =>
                  renderFeatureSlot(
                    rowEditActionsSlotKey<TRow>(),
                    slotFills.value,
                    rowEditing.props
                  )
              : undefined,
          })
        : original;
    if (!editingOn.value || row.summary) return row;
    rowTargets.set(row.key, row.row);
    const editableCells = lazyCells(() =>
      row.cells.map((cell) => editableCell(row, cell))
    );
    return withRowFields(row, {}, { cells: editableCells });
  };
  // Each row is decorated by a computed of its own, keyed by the row model it
  // decorates: Vue re-runs it only when something that row's decoration read
  // changes, so a change to one row does not hand every row new props.
  const selectable = computed(() => selection.value !== undefined);
  const currentSelection = () => selection.value;
  const rowActionList = computed<readonly RowAction<TRow>[] | undefined>(
    (previous) => {
      const next = mergedActions.value.rowActions;
      if (!next || previous?.length !== next.length) return next;
      return previous.every((action, index) => action === next[index])
        ? previous
        : next;
    }
  );
  const decorated = {
    row: new WeakMap<TableRowModel<TRow>, ComputedRef<TableRowModel<TRow>>>(),
    card: new WeakMap<TableRowModel<TRow>, ComputedRef<TableRowModel<TRow>>>(),
  };
  const decorate = (
    wiring: TableRowModel<TRow>,
    element: "row" | "card"
  ): TableRowModel<TRow> => {
    let row = decorated[element].get(wiring);
    if (!row) {
      row = computed(() => {
        const drawn = decorateNavigation(decorateRow(wiring));
        // Whether rows are selectable, not the selection itself: a row reads
        // its own selected state when it is drawn.
        return selectable.value
          ? withLiveSelection(drawn, currentSelection, element)
          : drawn;
      });
      decorated[element].set(wiring, row);
    }
    return row.value;
  };
  const decorateSlots = (
    slots: readonly TableBodySlot<TRow>[] | undefined,
    element: "row" | "card"
  ) =>
    slots?.map((slot) =>
      slot.kind === "row"
        ? { ...slot, wiring: decorate(slot.wiring, element) }
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
      const resizeAttrs = resize.value?.attrs(
        header.key,
        `${table.labels.value.resizeColumn}: ${header.context.label}`
      );
      return {
        ...header,
        attrs: mergeVueAttrs(
          mergeVueAttrs(
            mergeVueAttrs(
              resizeAttrs ? { style: { position: "relative" } } : {},
              header.attrs
            ),
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
                label: columnSelectLabel(table.labels.value.selectColumn, {
                  key: header.key,
                  header: header.context.label,
                }),
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
        resizeAttrs,
      };
    }),
    rows: windowedBody.value.desktop.rows.map((row) => decorate(row, "row")),
    bodySlots: decorateSlots(windowedBody.value.desktop.bodySlots, "row"),
  }));
  const mobile = computed(() => ({
    ...windowedBody.value.mobile,
    summary: mobileSummary.value,
    rows: windowedBody.value.mobile.rows.map((row) => decorate(row, "card")),
    bodySlots: decorateSlots(windowedBody.value.mobile.bodySlots, "card"),
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
  // Follows a replaced source's engine itself; the source owns the engine.
  const publisher = new TableRuntimePublisher<TRow>();
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
    find: find.value,
    density: featureDensity.value
      ? {
          density: featureDensity.value.density,
          onDensityChange: featureDensity.value.setDensity,
        }
      : undefined,
    fullscreen: fullscreen.value,
    contextMenu: contextMenu.value
      ? { entries: contextMenu.value.items, close: contextMenu.value.close }
      : undefined,
    commandPalette: commandPalette.value
      ? {
          commands: commandPalette.value.commands,
          open: commandPalette.value.show,
          close: commandPalette.value.close,
        }
      : undefined,
    print: printing.value ? { onPrint: printing.value } : undefined,
  }));
  const publish = (): TableRuntimeView<TRow> | undefined => {
    if (disposed) return undefined;
    const chrome = frame.value;
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
        editingLifecycle ??= lifecycleOwner?.run(useEditingLifecycle);
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
    // Features watch the options as one value: a new object on any change.
    options: computed(() => ({ ...resolved.value })),
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
  function useEditingLifecycle(): FeatureLifecycle<TRow> {
    return useFeatureLifecycle(lifecycleInput);
  }
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
  useMountStagger(
    root,
    () => [table.source.value.rows.length, isMobile.value],
    () => ({ enabled: toValue(options.value.animate) === true })
  );
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
