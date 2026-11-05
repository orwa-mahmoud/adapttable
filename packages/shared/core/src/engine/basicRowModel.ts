/**
 * Filter, sort, and search only.
 *
 * Grouping and aggregates are not evaluated. A patch re-filters the logged
 * rows; this model has no group tree or running totals to update in place.
 */
import type { SortableValue } from "../contracts/columns";
import type {
  IncrementalView,
  IncrementalViewConfig,
} from "../rows/incremental";
import { sortRows, sortRowsMulti } from "../sort/compare";
import { stableKey } from "../utils/stableKey";
import { cellSortValue } from "./cellValue";
import type { RowModel } from "./rowModelContract";
import { engineSearchText } from "./searchText";

const CONFIGS = new WeakMap<object, object>();

function remember<TRow>(
  view: IncrementalView<TRow>,
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  CONFIGS.set(view, config);
  return view;
}

function configOf<TRow>(
  view: IncrementalView<TRow>
): IncrementalViewConfig<TRow> | undefined {
  return CONFIGS.get(view) as IncrementalViewConfig<TRow> | undefined;
}

function queryKey<TRow>(config: IncrementalViewConfig<TRow>): string {
  return stableKey({
    search: config.search ?? "",
    extra: config.extra ?? {},
    filterTree: config.filterTree ?? null,
    sortBy: config.sortBy ?? null,
    sortDir: config.sortDir ?? null,
    sortLevels: (config.sortLevels ?? []).map((level) => ({
      key: level.key,
      dir: level.dir,
    })),
    columnKeys: (config.columns ?? []).map((column) => column.key),
    locale: config.locale ?? null,
    hasFilterFn: config.filterFn !== undefined,
    hasFilterTreeFn: config.filterTreeFn !== undefined,
    hasGetSortValue: config.getSortValue !== undefined,
  });
}

function definedPatch<TRow>(
  patch: Partial<IncrementalViewConfig<TRow>>
): Partial<IncrementalViewConfig<TRow>> {
  const defined: Partial<IncrementalViewConfig<TRow>> = {};
  for (const key of Object.keys(
    patch
  ) as (keyof IncrementalViewConfig<TRow>)[]) {
    const value = patch[key];
    if (value !== undefined) Object.assign(defined, { [key]: value });
  }
  return defined;
}

function searchTerm<TRow>(config: IncrementalViewConfig<TRow>): string {
  return config.search?.trim().toLowerCase() ?? "";
}

function rowMatches<TRow>(
  row: TRow,
  config: IncrementalViewConfig<TRow>
): boolean {
  const term = searchTerm(config);
  if (term) {
    const text = (config.getSearchText ?? engineSearchText)(row).toLowerCase();
    if (!text.includes(term)) return false;
  }
  if (config.filterFn && !config.filterFn(row, config.extra ?? {})) {
    return false;
  }
  if (
    config.filterTree &&
    config.filterTreeFn &&
    !config.filterTreeFn(row, config.filterTree)
  ) {
    return false;
  }
  return true;
}

function sortValue<TRow>(
  row: TRow,
  key: string,
  config: IncrementalViewConfig<TRow>
): SortableValue {
  if (config.getSortValue) return config.getSortValue(row, key);
  const column = config.columns?.find((item) => item.key === key);
  if (column) return cellSortValue(row, column, config.locale);
  return null;
}

function hasFilter<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  return (
    Boolean(searchTerm(config)) ||
    config.filterFn !== undefined ||
    (config.filterTree !== undefined && config.filterTreeFn !== undefined)
  );
}

function hasSort<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  if (config.sortLevels && config.sortLevels.length > 0) return true;
  return Boolean(config.sortBy && config.sortDir);
}

function createBasicView<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  const filtered = hasFilter(config)
    ? rows.filter((row) => rowMatches(row, config))
    : [...rows];
  let sorted = filtered;
  if (hasSort(config)) {
    sorted =
      config.sortLevels && config.sortLevels.length > 0
        ? sortRowsMulti(filtered, config.sortLevels, (row, key) =>
            sortValue(row, key, config)
          )
        : sortRows(
            filtered,
            (row) => sortValue(row, config.sortBy ?? "", config),
            config.sortDir ?? "asc"
          );
  }
  return remember(
    { rows, filtered, sorted, groups: undefined, aggregates: undefined },
    config
  );
}

/** Filter, sort, and search. No grouping and no aggregates. */
export function createBasicRowModel<TRow>(): RowModel<TRow> {
  return {
    create: createBasicView,
    reconfigure(view, patch, cleared) {
      const current = configOf(view);
      if (!current)
        return createBasicView(view.rows, patch as IncrementalViewConfig<TRow>);
      const merged: IncrementalViewConfig<TRow> = {
        ...current,
        ...definedPatch(patch),
      };
      for (const key of cleared) delete merged[key];
      if (queryKey(current) === queryKey(merged)) {
        return remember(view, merged);
      }
      return createBasicView(view.rows, merged);
    },
    applyPatch(view, log) {
      if (log.events.length === 0) return view;
      const config = configOf(view);
      if (!config) return view;
      return createBasicView(log.rows, config);
    },
    fork(view) {
      const config = configOf(view);
      const filtered = view.filtered.slice();
      const sorted =
        view.sorted === view.filtered ? filtered : view.sorted.slice();
      const copy: IncrementalView<TRow> = {
        rows: view.rows,
        filtered,
        sorted,
        groups: undefined,
        aggregates: undefined,
      };
      return config ? remember(copy, { ...config }) : copy;
    },
  };
}
