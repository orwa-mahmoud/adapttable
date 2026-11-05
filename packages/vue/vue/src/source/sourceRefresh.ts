import { stableKey, type TableViewState } from "@adapttable/core";

/** Reference equality for a source refresh. Row arrays are compared, not scanned. */
export function sameIdentity(
  left: readonly unknown[],
  right: readonly unknown[]
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) return false;
  }
  return true;
}

/** URL fields a source refresh reads. The state object itself is left out. */
export function sourceViewKey(state: TableViewState): string {
  return stableKey({
    page: state.page,
    limit: state.limit,
    search: state.search,
    sortBy: state.sortBy ?? null,
    sortDir: state.sortDir ?? null,
    groupBy: state.groupBy ?? null,
    extra: state.extra,
    filterTree: state.filterTree ?? null,
    sortLevels: state.sortLevels,
    groupAggregateOverrides: state.groupAggregateOverrides,
  });
}

export interface CachedSnapshot<T> {
  identity: readonly unknown[];
  viewKey: string;
  snapshot: T;
}

/**
 * Reuse the last snapshot when the semantic inputs match.
 *
 * The options object the caller built can be new on every read. Returning
 * the same snapshot keeps Vue's computed from publishing that read.
 */
export function cachedSnapshot<T>(
  held: { current: CachedSnapshot<T> | null },
  identity: readonly unknown[],
  viewKey: string,
  refresh: () => T
): T {
  const previous = held.current;
  if (
    previous?.viewKey === viewKey &&
    sameIdentity(previous.identity, identity)
  ) {
    return previous.snapshot;
  }
  const snapshot = refresh();
  held.current = { identity, viewKey, snapshot };
  return snapshot;
}
