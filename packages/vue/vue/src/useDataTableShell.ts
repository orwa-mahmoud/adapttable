/** One source, feature lifecycle and model composition shared by every Vue kit. */
import {
  ACTIONS_COLUMN_KEY,
  type BulkAction,
  type ConfirmHandler,
  createMemoryAdapter,
  type ExtraFilters,
  type FilterDef,
  type FilterTypeSpec,
  groupedViewSource,
  type QueryFilterGroup,
  resolveUrlAdapter,
  type RowAction,
  type TableDensity,
  type TableSource,
  withRowPinActions,
} from "@adapttable/core";
import {
  AGENT_APPROVAL,
  AGENT_APPROVAL_STATE,
  DENSITY_STATE,
  EMPTY_FEATURE_HOST,
  type FeatureHostState,
  type FilterEngine,
  type RuntimeChromeInput,
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

import { flattenColumns } from "./columnDef";
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
  headerFilterModelKey,
  headerFilterSlotKey,
  type RowActionControlsProjector,
  rowActionsModelKey,
  rowEditActionsSlotKey,
  rowPinningModelKey,
  type TableBodyProjector,
} from "./layout/modelChannels";
import {
  type TableBodySlot,
  type TableRowModel,
  useDesktopTableModel,
  useMobileCardsModel,
} from "./layout/tableModels";
import { useRowSelection } from "./selection/selection";
import { useViewportMobile } from "./source/sourceLifecycle";
import {
  useFrontendData,
  type UseFrontendDataOptions,
} from "./source/useFrontendData";
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
  readonly confirm?: ConfirmHandler;
  readonly density?: MaybeRefOrGetterOptional<TableDensity>;
  readonly defaultDensity?: TableDensity;
  readonly onDensityChange?: (next: TableDensity) => void;
  readonly selectable?: MaybeRefOrGetter<boolean>;
  readonly selectedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly defaultSelectedIds?: readonly string[];
  readonly onSelectionChange?: (ids: string[]) => void;
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
  const resolved = computed(
    () =>
      Object.assign(
        {},
        patches.value,
        Object.fromEntries(
          Object.entries(options.value).filter(
            ([, value]) => value !== undefined
          )
        )
      ) as unknown as ResolvedTableOptions<TRow>
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
    urlSync: supplied.value ? false : true,
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
  const selectionState = useRowSelection(() => ({
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
    toValue(resolved.value.selectable) === true ||
    resolved.value.selectedIds !== undefined ||
    resolved.value.onSelectionChange !== undefined
      ? selectionState
      : undefined
  );
  const table = useDataTable(() => ({
    ...resolved.value,
    forceMobile: isMobile,
    source: viewSource,
    selection: selection.value,
  }));
  const editHistory = state.get(editHistoryModelKey<TRow>());
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
    ...renderFeatureSlot(TOOLBAR_EXTRAS, slotFills.value, {
      ...toolbarExtrasProps.value,
      classNames,
    }),
  ];
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
    () => toValue(resolved.value.fitColumns) ?? false
  );
  const baseMobile = useMobileCardsModel(table, baseDesktop);
  const rowEditControlsVisible = computed(
    () =>
      editingChrome.value?.row !== undefined &&
      !table.layout.value.isHidden(ACTIONS_COLUMN_KEY)
  );
  const actionsDesktop = computed(() => ({
    ...baseDesktop.value,
    actionsLabel:
      mergedActions.value.rowActions || rowEditControlsVisible.value
        ? table.labels.value.actions
        : undefined,
    columnCount:
      baseDesktop.value.columnCount +
      (mergedActions.value.rowActions || rowEditControlsVisible.value ? 1 : 0),
  }));
  const body = computed(
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
  const requestConfirm: ConfirmHandler = (request) => {
    const confirm = resolved.value.confirm;
    if (!confirm)
      throw new Error(
        "AdaptTable: confirming a row action requires the adapter's confirm control."
      );
    confirm(request);
  };
  const decorateRow = (original: TableRowModel<TRow>): TableRowModel<TRow> => {
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
              active.value && resolved.value.rowActionControls === projector,
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
      cells: row.cells.map((cell) => ({
        ...cell,
        render: (display) =>
          renderFeatureSlot(editableCellSlotKey<TRow>(), slotFills.value, {
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
          }),
      })),
    };
  };
  const decorateSlots = (slots: readonly TableBodySlot<TRow>[] | undefined) =>
    slots?.map((slot) =>
      slot.kind === "row" ? { ...slot, wiring: decorateRow(slot.wiring) } : slot
    );
  const desktop = computed(() => ({
    ...body.value.desktop,
    headers: body.value.desktop.headers.map((header) => ({
      ...header,
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
    })),
    rows: body.value.desktop.rows.map(decorateRow),
    bodySlots: decorateSlots(body.value.desktop.bodySlots),
  }));
  const mobile = computed(() => ({
    ...body.value.mobile,
    rows: body.value.mobile.rows.map(decorateRow),
    bodySlots: decorateSlots(body.value.mobile.bodySlots),
  }));
  if (getCurrentInstance()) provideFeatureState(state);
  const active = useScopeActivity();
  const slotFills = computed(() => {
    const fills = featureSlotFillsOf(declarations.value);
    assertRequiredSlots(declarations.value, fills);
    return fills;
  });
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
    runtime,
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
    renderBatchEditBar,
    renderAgentApproval,
    renderTableAssistant,
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
