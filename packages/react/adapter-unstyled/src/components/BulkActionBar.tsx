/** Selection bar with the bulk actions and cross-page banner. */
import { useBulkActionRunner } from "@adapttable/react";
import {
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  offersAllMatching,
  resolveDisabledReason,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

import type { DataTableClassNames } from "../types";

/** Selection toolbar with bulk-action buttons. */
export function BulkBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
  classNames,
}: Readonly<BulkBarChromeProps & { classNames: DataTableClassNames }>) {
  const {
    selectedIds,
    selectedCount,
    clear,
    visibleIds,
    allMatching,
    selectAllMatching,
  } = selection;
  const { pending, error, run } = useBulkActionRunner({
    confirm,
    cancelLabel: labels.cancel,
    // Clear only on success — a failed run keeps the selection for retry.
    onComplete: (outcome) => {
      if (outcome.status === "success") clear();
    },
  });
  if (selectedCount === 0) return null;
  const errorMessage = bulkActionErrorMessage(error);
  const ids = [...selectedIds];
  // Core owns the question of whether the offer can be made at all; once
  // active, actions run against the whole set.
  const showBanner = offersAllMatching(selection, total);
  const scope = allMatching ? { allMatching: true, total } : undefined;

  return (
    <div data-adapttable-part="bulk-bar" className={classNames.bulkBar}>
      {/* A live region (implicit status role): selection changes are
          announced without stealing focus — the count was previously
          silent to screen readers. */}
      <output>{labels.selectedCount(selectedCount)}</output>
      {showBanner && (
        <div
          data-adapttable-part="select-all-banner"
          className={classNames.selectAllBanner}
        >
          <span
            data-adapttable-part="select-all-text"
            className={classNames.selectAllText}
          >
            {allMatching
              ? labels.allMatchingSelected(total)
              : labels.pageSelected(visibleIds.length)}
          </span>
          <button
            type="button"
            data-adapttable-part="select-all-button"
            className={classNames.selectAllButton}
            onClick={allMatching ? clear : selectAllMatching}
          >
            {allMatching ? labels.clearAll : labels.selectAllMatching(total)}
          </button>
        </div>
      )}
      <button type="button" onClick={clear} disabled={pending !== null}>
        {labels.clearAll}
      </button>
      {bulkActions.map((action) => {
        const reason = resolveDisabledReason(action.disabledReason?.(ids));
        return (
          <button
            key={action.key}
            type="button"
            title={reason}
            disabled={reason !== undefined || pending !== null}
            data-adapttable-part="bulk-button"
            data-color={action.color}
            className={classNames.bulkButton}
            onClick={() => run(action, ids, scope)}
          >
            {action.icon as ReactNode}
            {action.label}
          </button>
        );
      })}
      {errorMessage !== null && (
        <span
          role="alert"
          data-adapttable-part="bulk-error"
          className={classNames.bulkError}
        >
          {`${labels.errorTitle}: ${errorMessage}`}
        </span>
      )}
    </div>
  );
}
