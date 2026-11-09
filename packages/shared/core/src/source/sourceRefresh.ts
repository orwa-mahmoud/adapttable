/**
 * The inputs a source refresh compares, without walking the rows.
 *
 * React's retained frame and Vue's snapshot cache both ask the same two
 * questions: did the row array keep the same references, and did the URL
 * fields change. The key matches the React form, including a missing
 * aggregate override recorded as null so the field is never dropped.
 */
import type { ExtraFilters } from "../contracts/columns";
import type { GroupAggregateOverrides } from "../grouping/groupAggregateOverrides";
import type { SortLevel } from "../sort/compare";
import { sameItems } from "../utils/sameItems";
import { stableKey } from "../utils/stableKey";
import type { QueryFilterGroup } from "./queryContract";

/** The URL fields a source refresh reads. Setters stay out. */
export interface SourceViewKeyInput {
  readonly page: number;
  readonly limit: number;
  readonly search: string;
  readonly sortBy: string | undefined;
  readonly sortDir: string | undefined;
  readonly groupBy: string | undefined;
  readonly extra: ExtraFilters;
  readonly filterTree: QueryFilterGroup | undefined;
  readonly sortLevels: readonly SortLevel[];
  readonly groupAggregateOverrides: GroupAggregateOverrides | undefined;
}

/** URL fields a source refresh reads. The state object itself is left out. */
export function sourceViewKey(state: SourceViewKeyInput): string {
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
    groupAggregateOverrides: state.groupAggregateOverrides ?? null,
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
 * the same snapshot keeps a computed from publishing that read.
 */
export function cachedSnapshot<T>(
  held: { current: CachedSnapshot<T> | null },
  identity: readonly unknown[],
  viewKey: string,
  refresh: () => T
): T {
  const previous = held.current;
  if (previous?.viewKey === viewKey && sameItems(previous.identity, identity)) {
    return previous.snapshot;
  }
  const snapshot = refresh();
  held.current = { identity, viewKey, snapshot };
  return snapshot;
}
