/**
 * The query stage every row model shares: which rows match the search and
 * filters, how they sort, and which configuration changes force a re-query.
 * The basic and full row models both evaluate it from here.
 */
import { columnValueInputs } from "../columns/columnValueInputs";
import type { SortableValue } from "../contracts/columns";
import type { SortLevel } from "../contracts/query";
import { cellSortReader } from "../engine/cellValue";
import { engineSearchText } from "../engine/searchText";
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
    columns: columnValueInputs(config.columns),
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

/** The levels the query sorts by, outermost first; empty when it does not sort. */
export function sortLevels<TRow>(
  config: IncrementalViewConfig<TRow>
): readonly SortLevel[] {
  if (config.sortLevels && config.sortLevels.length > 0) {
    return config.sortLevels;
  }
  return config.sortBy && config.sortDir
    ? [{ key: config.sortBy, dir: config.sortDir }]
    : [];
}

export function hasSort<TRow>(config: IncrementalViewConfig<TRow>): boolean {
  return sortLevels(config).length > 0;
}

export function searchTerm<TRow>(config: IncrementalViewConfig<TRow>): string {
  return config.search?.trim().toLowerCase() ?? "";
}

/**
 * Whether a row passes `config`'s search, extra filters and filter tree. The
 * term and the callbacks are read once, not once per row.
 */
export function rowMatcher<TRow>(
  config: IncrementalViewConfig<TRow>
): (row: TRow) => boolean {
  const term = searchTerm(config);
  const project = config.getSearchText ?? engineSearchText;
  const { filterFn, filterTree, filterTreeFn } = config;
  const extra = config.extra ?? {};
  return (row) => {
    if (term && !project(row).toLowerCase().includes(term)) return false;
    if (filterFn && !filterFn(row, extra)) return false;
    return !filterTree || !filterTreeFn || filterTreeFn(row, filterTree);
  };
}

/**
 * How one sort level reads a row, prepared once per sort: the host's
 * `getSortValue`, else the level's column, found once rather than per row.
 */
export function sortValueReader<TRow>(
  key: string,
  config: IncrementalViewConfig<TRow>
): (row: TRow) => SortableValue {
  const { getSortValue } = config;
  if (getSortValue) return (row) => getSortValue(row, key);
  const column = config.columns?.find((item) => item.key === key);
  // A column that declares `sortValue` owns its whole ordering, including the
  // rows it answers `null` for — that answer means "this one has no place in
  // the order", and the comparator groups those at the end. Reading the
  // accessor for those rows instead would order one column by two different
  // extractors at once: some rows by their value, the rest by their rendered
  // text, with nothing on screen to say which row got which.
  if (!column) return () => null;
  return cellSortReader(column, config.locale);
}
