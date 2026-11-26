/**
 * The table data controller for Angular: which tier serves a table's rows —
 * a supplied source (a server source among them) or the frontend tier over
 * `data` — and the declarative filters both share. The choice, the merged
 * filter runtime, loading each filter's own options and a frontend table's
 * `onViewChange` are `@adapttable/core`'s table data controller.
 */
import {
  type ExtraFilters,
  type FilterDef,
  type FilterEngine,
  type FilterRuntime,
  type FilterTypeSpec,
  type FrontendEngineFactory,
  type PaginationMode,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
import {
  createTableData,
  type FeatureHostState,
  INACTIVE_TIER_ROWS,
  tierRows,
} from "@adapttable/core/binding";
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
import { type TableQueryHandler } from "./serverData";

/**
 * Options for {@link injectTableData}.
 *
 * @public
 */
export interface TableDataOptions<TRow> extends Pick<
  TableUrlStateOptions,
  "urlAdapter" | "urlSync" | "defaults" | "urlKey"
> {
  /**
   * A prebuilt source: `injectServerData`'s for rows a server pages, sorts
   * and filters, `injectQuerySource`'s, or any `TableSource`. Takes the
   * place of `data`.
   */
  readonly source?: MaybeSignalOptional<TableSource<TRow>>;
  /** Every row; the table pages, sorts and filters them itself. */
  readonly data?: MaybeSignalOptional<readonly TRow[]>;
  /** Frontend tier: the rows are still loading. */
  readonly loading?: MaybeSignalOptional<boolean>;
  /** A failure to show. */
  readonly error?: MaybeSignalOptional<Error | null>;
  /**
   * Frontend tier: told of each committed change to page, page size, search,
   * sort and filters, never of the mount. The table keeps processing `data`.
   */
  readonly onViewChange?: MaybeSignalOptional<TableQueryHandler>;
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
  /** The host of this table — filter-type plugins resolve from here. */
  readonly featureHost?: Signal<FeatureHostState | undefined>;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
  /**
   * Evaluator for the frontend tier. Defaults to the basic one. The shell
   * passes the full one while grouping is composed.
   */
  readonly createEngine?: MaybeSignalOptional<FrontendEngineFactory<TRow>>;
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
 * The frontend tier exists for the table's lifetime; while a source serves
 * the table it is handed no rows and no URL, and keeps its private state.
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
      onViewChange: readMaybe(options.onViewChange),
      columns: columns(),
      declaredFilters: options.filters,
      filterTypes: options.filterTypes,
      featureHost: options.featureHost?.(),
      locale: locale(),
      filterFn: options.filterFn,
    });
  });
  const tier = computed(() => plan().tier);
  // The frontend tier owns the URL while it serves the table. Filter keys
  // parsed as lists and numbers follow the runtime.
  const onFrontend = computed(() => tier() === "frontend");
  const mode = options.paginationMode;
  const frontend = injectFrontendData<TRow>({
    urlAdapter: options.urlAdapter,
    urlKey: options.urlKey,
    defaults: options.defaults,
    arrayExtraKeys: computed(() => plan().runtime.arrayExtraKeys),
    numberExtraKeys: computed(() => plan().runtime.numberExtraKeys),
    urlSync: computed(() =>
      onFrontend() ? readMaybe(options.urlSync) : false
    ),
    data: computed(() =>
      onFrontend() ? tierRows(true, data()) : INACTIVE_TIER_ROWS
    ),
    columns: computed(() => (onFrontend() ? columns() : INACTIVE_TIER_ROWS)),
    getRowId: options.getRowId,
    getSearchText: options.getSearchText,
    getSortValue: options.getSortValue,
    // Read the shared plan only while this tier is active. An idle frame
    // that called plan() would refresh on every live row change.
    get filterFn() {
      return onFrontend() ? plan().filterFn : undefined;
    },
    get filterTreeFn() {
      return onFrontend() ? plan().filterTreeFn : undefined;
    },
    filterKey: computed(() => plan().filterKey),
    locale,
    paginationMode: mode,
    createEngine: options.createEngine,
    forceMobile: options.forceMobile,
    mobileBreakpoint: options.mobileBreakpoint,
    isLoading: computed(() =>
      onFrontend() ? readMaybe(options.loading) : undefined
    ),
    error: options.error,
    injector,
  });
  const source = computed(() => {
    const resolved = readMaybe(options.source) ?? frontend();
    return controller.finish({ resolved, frontend: frontend() });
  });
  // Once the frame is on screen: tell a frontend table's `onViewChange`
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
