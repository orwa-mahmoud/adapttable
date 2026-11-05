import { stableKey } from "@adapttable/core";

/**
 * The last refresh a source hook applied, and whether React committed it.
 *
 * A repeat render may run before that commit (Strict Mode does). Skipping
 * then would publish a candidate the committed engine never accepted.
 */
export interface FrameHold<Frame> {
  identity: readonly unknown[];
  viewKey: string;
  frame: Frame;
  committed: boolean;
}

/**
 * Refresh unless this render is a repeat of a refresh React already committed.
 *
 * Identity is reference equality, including the row array. The view key is
 * the URL fields, not the wrapper object `useTableUrlState` returns. Neither
 * walks the rows.
 */
export function takeRetainedFrame<Frame>(
  held: { current: FrameHold<Frame> | null },
  identity: readonly unknown[],
  view: unknown,
  refresh: () => Frame
): { frame: Frame; skipped: boolean } {
  const viewKey = stableKey(view);
  const previous = held.current;
  if (
    previous?.committed === true &&
    previous.viewKey === viewKey &&
    sameIdentity(previous.identity, identity)
  ) {
    return { frame: previous.frame, skipped: true };
  }
  const frame = refresh();
  held.current = { identity, viewKey, frame, committed: false };
  return { frame, skipped: false };
}

/** The refresh just committed is safe to reuse on the next identical render. */
export function markFrameCommitted<Frame>(held: {
  current: FrameHold<Frame> | null;
}): void {
  if (held.current) held.current.committed = true;
}

/**
 * The view fields a source refresh reads. Setters stay out: they are stable,
 * and the object that carries them is new every render.
 */
export function sourceViewKey(state: {
  page: number;
  limit: number;
  search: string;
  sortBy: string | undefined;
  sortDir: string | undefined;
  groupBy: string | undefined;
  extra: object;
  filterTree: unknown;
  sortLevels: readonly object[];
  groupAggregateOverrides: unknown;
}): string {
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

function sameIdentity(
  left: readonly unknown[],
  right: readonly unknown[]
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) return false;
  }
  return true;
}
