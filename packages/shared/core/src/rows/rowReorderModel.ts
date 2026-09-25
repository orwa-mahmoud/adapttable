/**
 * Digest inputs for one row's reorder affordance. The React hook owns the
 * live state; the engine only needs this snapshot to memoize chrome.
 *
 * @public
 */
export interface RowReorderDigest {
  /** The row currently being dragged, if any. */
  lifted: unknown;
  /** Host-confirmation request in flight, if any. */
  pendingMove: unknown;
  /** True while the host has not yet answered. */
  hostConfirmPending?: boolean;
  /** Whether this row is the lifted one. */
  isLifted: (rowId: string) => boolean;
  /** Index currently under the pointer. */
  overIndex: number | null;
  /** Insertion edge on that index. */
  overPosition?: string | null;
}

/**
 * Memo digest so a virtualized row repaints when its reorder chrome changes.
 *
 * @public
 */
export function rowReorderSignature(
  reorder: RowReorderDigest | undefined,
  rowId: string,
  localIndex: number
): string | null {
  if (!reorder) return null;
  const inFlight = reorder.lifted !== null ? "L" : "";
  const confirming =
    (reorder.pendingMove !== null ? "P" : "") +
    (reorder.hostConfirmPending ? "H" : "");
  const lifted = reorder.isLifted(rowId) ? "d" : "";
  const targeted =
    reorder.overIndex === localIndex && reorder.lifted !== null ? "t" : "";
  const position = targeted ? (reorder.overPosition ?? "") : "";
  return `${inFlight}${confirming}${lifted}${targeted}${position}`;
}
