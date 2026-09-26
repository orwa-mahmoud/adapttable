/**
 * What the table says out loud when the rows underneath change.
 *
 * Sorting, filtering and paging all rewrite the body with no visible cue a
 * screen reader can reach: the rows are simply different ones. Without a status
 * message the user activates "Sort ascending", hears nothing, and has no way to
 * tell the control worked — which is what WCAG 4.1.3 is about, and what an
 * automated audit cannot detect, because the failure is a message that was
 * never written.
 *
 * Two rules shape the wording. It is ONE region rather than one per control, so
 * the announcements never race each other; and each message is a whole phrase
 * rather than a bare number, because a live region is read atomically and "87"
 * on its own says nothing. Everything except the sort sentence is composed from
 * labels the table already ships in every locale, so the count a user hears is
 * the same string the footer shows them.
 *
 * The resolver is pure: a binding keeps the last {@link TableStatusSignature},
 * settles again whenever the sort, the count, the page, the page size or the
 * rendered row count moves, and writes the result into its region — the empty
 * string included, so silence clears the region and a repeated message is
 * heard again.
 */
import { computePagination } from "../pagination/paginationMath";
import type { SortDirection, TableLabels } from "../types";

/**
 * What the table's status announcement is resolved from.
 *
 * @public
 */
export interface TableStatusAnnouncementOptions {
  /** Resolved labels — the announcements are built from them. */
  labels: Required<TableLabels>;
  /** Rows in the whole dataset. */
  total: number;
  /** Rows rendered right now, the page size when a source reports none. */
  shown: number;
  /** Current page, 1-based. */
  page: number;
  /** Page size. */
  limit: number;
  /** Whether the source pages at all — page position is noise if it does not. */
  paged: boolean;
  /** Key of the sorted column, if any. */
  sortBy?: string;
  /** Direction of that sort. */
  sortDir?: SortDirection;
  /** Human name of the sorted column, for the sentence. */
  sortColumnName?: string;
}

/**
 * The two halves of what might have changed since the last settle.
 *
 * @public
 */
export interface TableStatusSignature {
  /** The sorted column and direction. */
  readonly sort: string;
  /** The row count and the rendered window's bounds. */
  readonly result: string;
}

/**
 * Build the sentence for a sort that just changed.
 *
 * @param options - See {@link TableStatusAnnouncementOptions}.
 * @returns The phrase.
 */
function sortSentence(options: TableStatusAnnouncementOptions): string {
  const { labels, sortBy, sortDir, sortColumnName } = options;
  if (sortBy === undefined || sortDir === undefined) {
    return labels.sortingCleared;
  }
  return labels.sortedBy({
    column: sortColumnName ?? sortBy,
    ascending: sortDir === "asc",
  });
}

/**
 * Build the sentence for a row set that just changed — the same wording the
 * footer shows, so the two never disagree.
 *
 * @param options - See {@link TableStatusAnnouncementOptions}.
 * @param bounds - The resolved page window.
 * @returns The phrase, or `""` when there is nothing to say.
 */
function resultSentence(
  options: TableStatusAnnouncementOptions,
  bounds: { fromIndex: number; toIndex: number; totalPages: number }
): string {
  const { labels, total, paged } = options;
  // Nothing to say: every adapter's empty state is itself a `role="status"`
  // region, so it announces its own arrival. Repeating its words here would
  // make a screen reader read them twice.
  if (total === 0) return "";
  const rows = labels.showing({
    from: bounds.fromIndex,
    to: bounds.toIndex,
    total,
  });
  // Page position only earns a mention when there is more than one page to be
  // on; otherwise it is a sentence that never changes.
  if (!paged || bounds.totalPages <= 1) return rows;
  return `${labels.pageOf({ page: options.page, total: bounds.totalPages })}. ${rows}`;
}

/**
 * Resolve what the table should announce, given what it announced last.
 *
 * Pure on purpose: the caller owns the "last" value, which makes every case
 * — including the first settle, where the table must stay silent — testable
 * without rendering anything.
 *
 * @param options - See {@link TableStatusAnnouncementOptions}.
 * @param previous - The signature from the last settle, or `undefined` on the first.
 * @returns The message to announce (`""` for silence) and the new signature.
 *
 * @public
 */
export function resolveTableStatus(
  options: TableStatusAnnouncementOptions,
  previous: TableStatusSignature | undefined
): { announcement: string; signature: TableStatusSignature } {
  const { total, page, limit, shown } = options;
  const bounds = computePagination({
    page,
    limit: limit > 0 ? limit : Math.max(shown, 1),
    total,
  });
  const signature: TableStatusSignature = {
    sort: `${options.sortBy ?? ""}:${options.sortDir ?? ""}`,
    result: `${total}:${bounds.fromIndex}:${bounds.toIndex}`,
  };
  // The first settle is the table arriving, not the table changing. Announcing
  // then would talk over whatever the user was reading when the page loaded.
  if (!previous) return { announcement: "", signature };
  const parts: string[] = [];
  if (previous.sort !== signature.sort) parts.push(sortSentence(options));
  if (previous.result !== signature.result) {
    parts.push(resultSentence(options, bounds));
  }
  return { announcement: parts.filter(Boolean).join(". "), signature };
}
