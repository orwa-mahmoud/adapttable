/**
 * The query stage every row model shares: which rows match the search and
 * filters, how they sort, and which configuration changes force a re-query.
 * The basic and full row models both evaluate it from here.
 */
import type { SortableValue } from "../contracts/columns";
import { cellSortValue } from "../engine/cellValue";
import { engineSearchText } from "../engine/searchText";
import { sortRows, sortRowsMulti } from "../sort/compare";
import { stableKey } from "../utils/stableKey";
import type { IncrementalViewConfig } from "./incremental";

export function definedConfigPatch<TRow>(
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

export function queryConfigFingerprint<TRow>(
  config: IncrementalViewConfig<TRow>
): string {
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

export function hasFilter<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  return (
    Boolean(searchTerm(config)) ||
    config.filterFn !== undefined ||
    (config.filterTree !== undefined && config.filterTreeFn !== undefined)
  );
}

export function hasSort<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  if (config.sortLevels && config.sortLevels.length > 0) return true;
  return Boolean(config.sortBy && config.sortDir);
}

export function searchTerm<TRow>(config: IncrementalViewConfig<TRow>): string {
  return config.search?.trim().toLowerCase() ?? "";
}

export function rowMatches<TRow>(
  row: TRow,
  config: IncrementalViewConfig<TRow>,
  cachedText?: string
): boolean {
  const term = searchTerm(config);
  if (term) {
    const projector = config.getSearchText ?? engineSearchText;
    const text = (cachedText ?? projector(row)).toLowerCase();
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

export function sortMatchedRows<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): TRow[] {
  const levels = config.sortLevels;
  if (levels && levels.length > 0) {
    return sortRowsMulti(rows, levels, (row, key) =>
      resolveSortValue(row, key, config)
    );
  }
  return sortRows(
    rows,
    (row) => resolveSortValue(row, config.sortBy!, config),
    config.sortDir!
  );
}

export function resolveSortValue<TRow>(
  row: TRow,
  key: string,
  config: IncrementalViewConfig<TRow>
): SortableValue {
  if (config.getSortValue) return config.getSortValue(row, key);
  const column = config.columns?.find((item) => item.key === key);
  // A column that declares `sortValue` owns its whole ordering, including the
  // rows it answers `null` for — that answer means "this one has no place in
  // the order", and the comparator groups those at the end. Reading the
  // accessor for those rows instead would order one column by two different
  // extractors at once: some rows by their value, the rest by their rendered
  // text, with nothing on screen to say which row got which.
  if (column) return cellSortValue(row, column, config.locale);
  return null;
}
