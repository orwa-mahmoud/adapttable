import {
  bulkActionErrorMessage,
  type BulkActionOutcome,
  bulkBarModel,
  type ConfirmHandler,
  type TableLabels,
} from "@adapttable/core";
import type { BulkBarState } from "@adapttable/core/binding";

import type { SelectionState } from "../selection/useSelection";
import { useBulkActionRunner } from "./useBulkActionRunner";
export type { BulkActionContext } from "@adapttable/core";
export type { BulkBarState } from "@adapttable/core/binding";

/**
 * Options for {@link useBulkBarState}.
 *
 * @public
 */
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

/**
 * Derive the kit-independent state a bulk-action toolbar renders from:
 * the selected ids, the in-flight action, the run/clear handlers, and the
 * two-state "select all matching" banner. Extracting this keeps the logic in
 * one place so adapter `BulkBar` components only differ in their kit JSX.
 *
 * Call unconditionally (it uses a hook); do the `selectedCount === 0` early
 * return in the adapter AFTER calling this.
 *
 * @public
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
  const {
    expandable,
    scope,
    banner: model,
  } = bulkBarModel(selection, total, labels);
  const banner = {
    text: model.text,
    action: model.action,
    onClick: model.command === "clear" ? clear : selection.selectAllMatching,
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
