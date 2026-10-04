/** One source, feature lifecycle and model composition shared by every Vue kit. */
import {
  ACTIONS_COLUMN_KEY,
  type BulkAction,
  type ConfirmHandler,
  type ExtraFilters,
  type FilterDef,
  type FilterTypeSpec,
  type QueryFilterGroup,
  type RowAction,
  type TableDensity,
  type TableSource,
  withRowPinActions,
} from "@adapttable/core";
import {
  DENSITY_STATE,
  EMPTY_FEATURE_HOST,
  type FeatureHostState,
  type FilterEngine,
  type RuntimeChromeInput,
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
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { flattenColumns } from "./columnDef";
import { useFeatureLifecycle } from "./featureLifecycle";
import {
  assertRequiredSlots,
  type ComposedFeature,
  featureOptionsOf,
  featureSlotFillsOf,
  normalizeFeatures,
  renderFeatureSlot,
} from "./features/tableFeature";
import { createFeatureState, provideFeatureState } from "./featureState";
import { createFilterOptionCache } from "./layout/filterOptionCache";
import {
  COLUMN_RESIZE_MODEL,
  editableCellSlotKey,
  editHistoryModelKey,
  editingModelKey,
  headerFilterModelKey,
  headerFilterSlotKey,
  type RowActionControlsProjector,
  rowActionsModelKey,
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
export interface DataTableSurface {
  scrollElement(): HTMLElement | null;
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
export interface ResolvedTableOptions<
  TRow,
> extends UseDataTableShellOptions<TRow> {
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
    urlSync: supplied.value ? false : resolved.value.urlSync,
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
  const selectionState = useRowSelection(() => ({
    rows: source.value.rows,
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
    source,
    selection: selection.value,
  }));
  const state = createFeatureState();
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
  const renderToolbarExtras = (
    classNames?: Readonly<Record<string, string | undefined>>
  ) =>
    renderFeatureSlot(TOOLBAR_EXTRAS, slotFills.value, {
      ...toolbarExtrasProps.value,
      classNames,
    });
  const pinning = state.get(rowPinningModelKey<TRow>());
  const editing = state.get(editingModelKey<TRow>());
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
  const actionsDesktop = computed(() => ({
    ...baseDesktop.value,
    actionsLabel: mergedActions.value.rowActions
      ? table.labels.value.actions
      : undefined,
    columnCount:
      baseDesktop.value.columnCount + (mergedActions.value.rowActions ? 1 : 0),
  }));
  const body = computed(
    () =>
      resolved.value.bodyModel?.({
        table,
        options: resolved.value,
        desktop: actionsDesktop.value,
        mobile: baseMobile.value,
        pinning: pinning.value,
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
    const controls =
      !original.summary && projector && mergedActions.value.rowActions
        ? projector({
            row: original.row,
            actions: mergedActions.value.rowActions,
            confirm: requestConfirm,
            cancelLabel: table.labels.value.cancel,
            enabled: () =>
              active.value && resolved.value.rowActionControls === projector,
          })
        : undefined;
    const row = controls ? { ...original, actionControls: controls } : original;
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
            rows: table.rows.value,
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
    source: source.value,
    getRowId: table.rowKey,
    allColumns: table.allColumns.value,
    columnLayout: table.layout.value,
    columnLayoutLive: true,
    rowPinning: pinning.value,
    editing: editing.value,
    filterDefs: filterRuntime.value?.defs,
    filterRegistry: filterRuntime.value?.registry,
    table: {
      labels: table.labels.value,
      selection: selection.value
        ? {
            selectedIds: selection.value.selectedIds.value,
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
  let reconciling = false;
  const reconcile = (): void => {
    if (reconciling || disposed) return;
    reconciling = true;
    try {
      assertRequiredSlots(declarations.value, slotFills.value);
      publish();
      lifecycle.reconcile(declarations.value);
      publish();
    } finally {
      reconciling = false;
    }
  };
  const lifecycle = useFeatureLifecycle({
    runtime,
    table,
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
  });
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
    source,
    selection,
    desktop,
    mobile,
    state,
    active,
    features: declarations,
    featureHost: lifecycle.host,
    rowActions,
    editing,
    filterRuntime,
    featureOptions: patches,
    density,
    setDensity,
    toolbarExtrasProps,
    renderToolbarExtras,
    slotFills,
    runtime,
    handle,
    reconcile,
    setSurface: (next: DataTableSurface | null): void => {
      surface.value = next;
    },
  };
}
export type UseDataTableShellResult<TRow> = ReturnType<
  typeof useDataTableShell<TRow>
>;
