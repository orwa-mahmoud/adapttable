import type { SelectionState } from "../selection/useSelection";
import type { BulkAction, BulkActionContext, TableLabels } from "../types";
import { type ConfirmHandler } from "./confirm";
import {
  bulkActionErrorMessage,
  type BulkActionOutcome,
  useBulkActionRunner,
} from "./useBulkActionRunner";

/** Options for {@link useBulkBarState}. */
export interface UseBulkBarStateOptions {
  /** Current selection state. */
  selection: SelectionState;
  /** Total rows in the filtered set (drives the "select all matching" banner). */
  total: number;
  /** Confirmation handler for actions that declare a `confirm` block. */
  confirm: ConfirmHandler;
  /** Resolved labels. */
  labels: Required<TableLabels>;
}

/** The derived bulk-bar state every adapter renders from. */
export interface BulkBarState {
  /** Number of rows currently selected. */
  selectedCount: number;
  /** Selected ids as a fresh array (safe to pass to `run`). */
  ids: string[];
  /** Key of the action currently running, or `null`. */
  pending: string | null;
  /**
   * Message of the last failed run, or `null`. The selection is KEPT on
   * failure (so the user can retry); adapters render this in the bar,
   * ideally in a live region.
   */
  errorMessage: string | null;
  /** Run a bulk action against `ids` (and `scope` when "all matching" is on). */
  run: (action: BulkAction, ids: string[], context?: BulkActionContext) => void;
  /** Clear the selection. */
  clear: () => void;
  /** Whether the "select all N matching" banner should show. */
  expandable: boolean;
  /** Bulk-action scope: the whole matching set when active, else `undefined`. */
  scope: BulkActionContext | undefined;
  /** The banner's text, action label, and click handler for the current state. */
  banner: { text: string; action: string; onClick: () => void };
}

/**
 * Derive the kit-independent state a bulk-action toolbar renders from:
 * the selected ids, the in-flight action, the run/clear handlers, and the
 * two-state "select all matching" banner. Extracting this keeps the logic in
 * one place so adapter `BulkBar` components only differ in their kit JSX.
 *
 * Call unconditionally (it uses a hook); do the `selectedCount === 0` early
 * return in the adapter AFTER calling this.
 */
export function useBulkBarState({
  selection,
  total,
  confirm,
  labels,
}: Readonly<UseBulkBarStateOptions>): BulkBarState {
  const { selectedIds, selectedCount, clear } = selection;
  const { pending, error, run } = useBulkActionRunner({
    confirm,
    cancelLabel: labels.cancel,
    // Clear only on success — a failed run keeps the selection for retry.
    onComplete: (outcome: BulkActionOutcome) => {
      if (outcome.status === "success") clear();
    },
  });
  const errorMessage = bulkActionErrorMessage(error);
  const ids = [...selectedIds];
  // A full page is selected but more rows match elsewhere → show the
  // two-state "select all N matching" banner instead of the plain count.
  const expandable =
    selection.headerState === "all" && total > selection.visibleIds.length;
  // When "all matching" is active, bulk actions act on the WHOLE filtered
  // set: the context tells the handler (and the confirm count) so.
  const scope = selection.allMatching
    ? { allMatching: true, total }
    : undefined;
  const banner = selection.allMatching
    ? {
        text: labels.allMatchingSelected(total),
        action: labels.clearAll,
        onClick: clear,
      }
    : {
        text: labels.pageSelected(selection.visibleIds.length),
        action: labels.selectAllMatching(total),
        onClick: selection.selectAllMatching,
      };
  return {
    selectedCount,
    ids,
    pending,
    errorMessage,
    run,
    clear,
    expandable,
    scope,
    banner,
  };
}
