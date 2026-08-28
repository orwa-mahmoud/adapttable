/**
 * Derived pagination figures for a paged view.
 *
 * @public
 */
export interface PaginationInfo {
  /** Total number of pages (always ≥ 1). */
  totalPages: number;
  /** The page clamped into `[1, totalPages]`. */
  safePage: number;
  /** 1-based index of the first row on the page (0 when empty). */
  fromIndex: number;
  /** 1-based index of the last row on the page (0 when empty). */
  toIndex: number;
}

/**
 * Compute page count and the visible "from–to" range for a paged view.
 *
 * @param input - Current `page`, `limit`, and `total`.
 * @returns The derived {@link PaginationInfo}.
 *
 * @internal
 */
export function computePagination(input: {
  page: number;
  limit: number;
  total: number;
}): PaginationInfo {
  // Coerce non-finite inputs (NaN/Infinity from hand-built params or bad
  // data) to sane defaults so the derived figures are never NaN.
  const limit = Number.isFinite(input.limit) ? Math.max(input.limit, 1) : 1;
  const total = Number.isFinite(input.total) ? Math.max(input.total, 0) : 0;
  const page = Number.isFinite(input.page) ? input.page : 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const fromIndex = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const toIndex = Math.min(safePage * limit, total);
  return { totalPages, safePage, fromIndex, toIndex };
}

/**
 * One slot in a numbered pager: a page number, or a gap where pages were elided.
 *
 * @internal
 */
export type PaginationItem = number | "ellipsis";

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let n = start; n <= end; n += 1) out.push(n);
  return out;
}

/**
 * A pager slot paired with a stable React key — page numbers key on themselves,
 * ellipses on their semantic side (`ellipsis-left` / `ellipsis-right`). Use this
 * instead of indexing into {@link paginationItems} so list keys never depend on
 * the array position.
 *
 * @internal
 */
export interface PaginationSlot {
  /** The page number or `"ellipsis"` marker. */
  item: PaginationItem;
  /** A stable, position-free React key for this slot. */
  key: string;
}

/**
 * Build the keyed pager slots (see {@link PaginationSlot}) for a numbered pager.
 * Wraps {@link paginationItems}, assigning each ellipsis a `left`/`right` side
 * key in encounter order — at most two ellipses ever appear, so the side is a
 * stable identity that does not rely on the array index.
 *
 * @param page - The current (1-based) page.
 * @param totalPages - Total page count (coerced to ≥ 1).
 * @param siblings - Pages to show on each side of the current page.
 * @returns Keyed pager slots.
 *
 * @internal
 */
export function paginationSlots(
  page: number,
  totalPages: number,
  siblings = 1
): PaginationSlot[] {
  let nextSide: "left" | "right" = "left";
  return paginationItems(page, totalPages, siblings).map((item) => {
    if (item === "ellipsis") {
      const key = `ellipsis-${nextSide}`;
      nextSide = "right";
      return { item, key };
    }
    return { item, key: String(item) };
  });
}

/**
 * Build the page-number sequence for a numbered pager — the first and last
 * (boundary) pages, the current page with `siblings` neighbours on each side,
 * and an `"ellipsis"` marker wherever a run of pages is elided. Mirrors the
 * `boundaries: 1` / `siblings: 1` defaults of the kit `<Pagination>` widgets so
 * every adapter — including the hand-rendered unstyled and Chakra pagers — lays
 * pages out identically.
 *
 * @param page - The current (1-based) page.
 * @param totalPages - Total page count (coerced to ≥ 1).
 * @param siblings - Pages to show on each side of the current page.
 * @returns Ordered page numbers interleaved with `"ellipsis"` gaps.
 *
 * @internal
 */
export function paginationItems(
  page: number,
  totalPages: number,
  siblings = 1
): PaginationItem[] {
  const total = Number.isFinite(totalPages)
    ? Math.max(1, Math.floor(totalPages))
    : 1;
  const current = Math.min(Math.max(Math.floor(page) || 1, 1), total);
  const boundaries = 1;

  // With first/last boundaries, the current page + its siblings, and two
  // ellipses, this many slots fit without eliding anything — so just list all.
  const maxSlots = boundaries * 2 + siblings * 2 + 3;
  if (total <= maxSlots) return range(1, total);

  const left = Math.max(
    Math.min(current - siblings, total - boundaries - siblings * 2 - 1),
    boundaries + 2
  );
  const right = Math.min(
    Math.max(current + siblings, boundaries + siblings * 2 + 2),
    total - boundaries - 1
  );

  return [
    ...range(1, boundaries),
    // Collapse a single skipped page to that page rather than an ellipsis.
    left > boundaries + 2 ? "ellipsis" : boundaries + 1,
    ...range(left, right),
    right < total - boundaries - 1 ? "ellipsis" : total - boundaries,
    ...range(total - boundaries + 1, total),
  ];
}
