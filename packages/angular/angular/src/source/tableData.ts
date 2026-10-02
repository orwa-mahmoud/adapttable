/**
 * The table data controller for Angular: which tier serves a table's rows —
 * a prebuilt source, the server tier or the frontend tier — and the
 * declarative filters every tier shares. The choice, the merged filter
 * runtime, loading each filter's own options, facet counts and a frontend
 * table's `onQueryChange` are `@adapttable/core`'s table data controller.
 */
import {
  createTableData,
  type ExtraFilters,
  type FacetMap,
  type FilterDef,
  type FilterEngine,
  type FilterRuntime,
  type FilterTypeSpec,
  type PaginationMode,
  type QueryAggregate,
  type QuerySupport,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
import type { FeatureHostState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import { type ColumnDef, resolveColumns } from "../columnDef";
import {
  fromStore,
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "../store";
import type { TableUrlStateOptions } from "../url/tableUrlState";
import { injectFrontendData } from "./frontendData";
import { injectServerData, type TableQueryHandler } from "./serverData";

/** The server tier's columns while the table is not on it: none. */
const NO_COLUMNS: readonly never[] = [];

/**
 * Options for {@link injectTableData}.
 *
 * @public
 */
export interface TableDataOptions<TRow> extends Pick<
  TableUrlStateOptions,
  "urlAdapter" | "urlSync" | "defaults" | "urlKey"
> {
  /** Full-control tier: a prebuilt source, such as `injectQuerySource`'s. */
  readonly source?: MaybeSignalOptional<TableSource<TRow>>;
  /** The rows: all of them (frontend) or the current page (server). */
  readonly data?: MaybeSignalOptional<readonly TRow[]>;
  /** Server tier: total row count across all pages. */
  readonly total?: MaybeSignalOptional<number>;
  /** A request in flight. */
  readonly loading?: MaybeSignalOptional<boolean>;
  /** A failure to show. */
  readonly error?: MaybeSignalOptional<Error | null>;
  /**
   * Explicit data mode. `"server"` makes `onQueryChange` the data contract
   * (the host fetches); `"frontend"` keeps the table's own processing and
   * makes `onQueryChange` a notification. Absent: `data` alone is frontend,
   * `data` with `onQueryChange` is server, `source` is the source tier.
   */
  readonly mode?: MaybeSignalOptional<"frontend" | "server">;
  /** Server tier: aggregates to ask the endpoint for. */
  readonly aggregates?: MaybeSignalOptional<readonly QueryAggregate[]>;
  /** Server tier: the key of the query the current `data` answers. */
  readonly responseKey?: MaybeSignalOptional<string>;
  /** The server tier's fetch, or a frontend table's change notification. */
  readonly onQueryChange?: MaybeSignalOptional<TableQueryHandler>;
  /** Columns — their `filter` shorthands feed the runtime. */
  readonly columns: MaybeSignal<readonly ColumnDef<TRow>[]>;
  /**
   * The filter engine, when the filters feature is composed. Without it no
   * filter is built, counted or loaded.
   */
  readonly engine?: FilterEngine;
  /** Table-level declarative filters. */
  readonly filters?: readonly FilterDef<TRow>[];
  /** Extra or replacement filter types merged onto the built-in registry. */
  readonly filterTypes?: readonly FilterTypeSpec[];
  /** Extra client-side predicate AND-ed with the declarative ones. */
  readonly filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  /** Pagination mode. Defaults to `"auto"` (mobile → infinite). */
  readonly paginationMode?: MaybeSignal<PaginationMode>;
  /** Force the mobile state instead of reading the viewport. */
  readonly forceMobile?: MaybeSignalOptional<boolean>;
  /** The width, in pixels, at or below which `"auto"` means infinite. */
  readonly mobileBreakpoint?: number;
  /** How a row's id is derived, for the frontend tier. */
  readonly getRowId?: (row: TRow) => string;
  /** Frontend tier: a row's searchable text. */
  readonly getSearchText?: (row: TRow) => string;
  /** Frontend tier: a cell's sort value, overriding the column's own. */
  readonly getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  /** Active locale for `i18n` column paths. */
  readonly locale?: MaybeSignalOptional<string>;
  /** Server tier: what the endpoint can answer. */
  readonly supports?: MaybeSignalOptional<QuerySupport>;
  /** Server tier: keys to count; defaults to every checklist filter. */
  readonly facetKeys?: MaybeSignalOptional<readonly string[]>;
  /** Server tier: distinct-value counts from the last fetch. */
  readonly facets?: MaybeSignalOptional<FacetMap>;
  /** The host of this table — filter-type plugins resolve from here. */
  readonly featureHost?: Signal<FeatureHostState | undefined>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * What {@link injectTableData} gives the table.
 *
 * @public
 */
export interface TableDataResult<TRow> {
  /** The source the table reads, whichever tier serves it. */
  readonly source: Signal<TableSource<TRow>>;
  /** The merged filter runtime every tier shares. */
  readonly runtime: Signal<FilterRuntime<TRow>>;
}

/**
 * Resolve a table's data tier and its declarative-filter runtime.
 *
 * Both built-in tiers exist for the table's lifetime; the one not serving
 * it is handed no rows, no query callback and no URL. The active tier owns
 * the URL, including after replacing a source or changing the data mode.
 *
 * @param options - See {@link TableDataOptions}.
 * @returns The source and the filter runtime.
 *
 * @public
 */
export function injectTableData<TRow>(
  options: TableDataOptions<TRow>
): TableDataResult<TRow> {
  if (!options.injector) assertInInjectionContext(injectTableData);
  const injector = options.injector ?? inject(Injector);
  const controller = createTableData<TRow>();
  // A filter's own option list landing moves the plan through here.
  const revision = fromStore(
    { getSnapshot: controller.revision, subscribe: controller.subscribe },
    { injector }
  );
  const locale = computed(() => readMaybe(options.locale));
  const columns = computed(() =>
    resolveColumns(readMaybe(options.columns), locale())
  );
  const data = computed(() => readMaybe(options.data));
  const plan = computed(() => {
    revision();
    return controller.plan({
      engine: options.engine,
      source: readMaybe(options.source),
      data: data(),
      mode: readMaybe(options.mode),
      onQueryChange: readMaybe(options.onQueryChange),
      columns: columns(),
      declaredFilters: options.filters,
      filterTypes: options.filterTypes,
      featureHost: options.featureHost?.(),
      locale: locale(),
      filterFn: options.filterFn,
      facetKeys: readMaybe(options.facetKeys),
    });
  });
  const tier = computed(() => plan().tier);
  // The active tier owns the URL; each inactive tier retains private view
  // state. Filter keys parsed as lists and numbers follow the runtime.
  const urlOptions = {
    urlAdapter: options.urlAdapter,
    urlKey: options.urlKey,
    defaults: options.defaults,
    arrayExtraKeys: computed(() => plan().runtime.arrayExtraKeys),
    numberExtraKeys: computed(() => plan().runtime.numberExtraKeys),
  };
  const onServer = computed(() => tier() === "server");
  const onFrontend = computed(() => tier() === "frontend");
  const mode = options.paginationMode;
  const frontend = injectFrontendData<TRow>({
    ...urlOptions,
    urlSync: computed(() =>
      onFrontend() ? readMaybe(options.urlSync) : false
    ),
    data: computed(() => (onFrontend() ? (data() ?? []) : [])),
    columns,
    getRowId: options.getRowId,
    getSearchText: options.getSearchText,
    getSortValue: options.getSortValue,
    get filterFn() {
      return plan().filterFn;
    },
    get filterTreeFn() {
      return plan().filterTreeFn;
    },
    filterKey: computed(() => plan().filterKey),
    locale,
    paginationMode: mode,
    forceMobile: options.forceMobile,
    mobileBreakpoint: options.mobileBreakpoint,
    isLoading: computed(() =>
      readMaybe(options.mode) === "frontend"
        ? readMaybe(options.loading)
        : undefined
    ),
    error: options.error,
    injector,
  });
  const server = injectServerData<TRow>({
    ...urlOptions,
    urlSync: computed(() => (onServer() ? readMaybe(options.urlSync) : false)),
    rows: computed(() => (onServer() ? (data() ?? []) : [])),
    total: computed(() => readMaybe(options.total) ?? 0),
    loading: options.loading,
    error: options.error,
    paginationMode: mode,
    forceMobile: options.forceMobile,
    mobileBreakpoint: options.mobileBreakpoint,
    // A column's default aggregate is a request to the server, so only the
    // server tier reads the columns.
    columns: computed(() => (onServer() ? columns() : NO_COLUMNS)),
    onQueryChange: computed(() =>
      onServer() ? readMaybe(options.onQueryChange) : undefined
    ),
    aggregates: computed(() =>
      onServer() ? readMaybe(options.aggregates) : undefined
    ),
    responseKey: computed(() =>
      onServer() ? readMaybe(options.responseKey) : undefined
    ),
    supports: computed(() =>
      onServer() ? readMaybe(options.supports) : undefined
    ),
    facetKeys: computed(() => (onServer() ? plan().facetKeys : undefined)),
    facets: computed(() =>
      onServer() ? readMaybe(options.facets) : undefined
    ),
    injector,
  });

  const source = computed(() => {
    const prebuilt = readMaybe(options.source);
    let resolved: TableSource<TRow>;
    if (prebuilt) resolved = prebuilt;
    else if (onServer()) resolved = server();
    else resolved = frontend();
    return controller.finish({ resolved, frontend: frontend() });
  });
  // Once the frame is on screen: tell a frontend table's `onQueryChange`
  // about a change.
  effect(
    () => {
      source();
      untracked(() => {
        controller.commit();
      });
    },
    { injector }
  );
  // Each filter's own option list loads once; one that settles after the
  // filters change reports nothing.
  const defs = computed(() => plan().runtime.defs);
  effect(
    (onCleanup) => {
      defs();
      onCleanup(untracked(() => controller.loadOptions()));
    },
    { injector }
  );
  injector.get(DestroyRef).onDestroy(controller.dispose);

  return { source, runtime: computed(() => plan().runtime) };
}
