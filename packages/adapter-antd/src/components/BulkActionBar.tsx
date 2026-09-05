/** Selection bar with the bulk actions and cross-page banner. */
import { useBulkActionRunner } from "@adapttable/react";
import {
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  offersAllMatching,
} from "@adapttable/react/adapter";
import { Alert, Button, Space, Typography } from "antd";
import type { ReactNode } from "react";

import { isDangerColor } from "../colors";

/**
 * One state of the cross-page selection banner: a status text plus an
 * inline link widening the scope ("select all N matching") or backing out
 * of it ("clear all").
 */
function bannerLine(
  text: string,
  actionLabel: string,
  onClick: () => void,
  disabled: boolean
) {
  return (
    <Space size={4} wrap data-adapttable-part="select-all-banner">
      <Typography.Text data-adapttable-part="select-all-text">
        {text}
      </Typography.Text>
      <Button
        size="small"
        type="link"
        data-adapttable-part="select-all-button"
        disabled={disabled}
        onClick={onClick}
      >
        {actionLabel}
      </Button>
    </Space>
  );
}

/**
 * Selection bar, rendered with antd's idiomatic `Alert` + `action` slot
 * (the pattern antd's own Table docs use for batch operations). When a
 * full page is selected and more rows match on other pages, the message
 * becomes a two-state banner: offer "select all N matching", then report
 * the widened scope — bulk actions run with `allMatching` so the backend
 * can act on the whole filtered set.
 */
export function BulkBar(props: Readonly<BulkBarChromeProps>) {
  const { selection, total, bulkActions, confirm, labels } = props;
  const runner = useBulkActionRunner({
    confirm,
    cancelLabel: labels.cancel,
    // Clear only on success — a failed run keeps the selection for retry.
    onComplete: (outcome) => {
      if (outcome.status === "success") selection.clear();
    },
  });
  if (selection.selectedCount === 0) return null;
  const errorMessage = bulkActionErrorMessage(runner.error);
  const ids = [...selection.selectedIds];
  const busy = runner.pending !== null;
  const crossPage = offersAllMatching(selection, total);
  const context = selection.allMatching
    ? { allMatching: true, total }
    : undefined;
  let message: ReactNode = labels.selectedCount(selection.selectedCount);
  if (crossPage) {
    message = selection.allMatching
      ? bannerLine(
          labels.allMatchingSelected(total),
          labels.clearAll,
          selection.clear,
          busy
        )
      : bannerLine(
          labels.pageSelected(selection.visibleIds.length),
          labels.selectAllMatching(total),
          selection.selectAllMatching,
          busy
        );
  }
  return (
    <Alert
      data-adapttable-part="bulk-bar"
      type={errorMessage === null ? "info" : "error"}
      banner
      title={message}
      description={
        errorMessage === null ? undefined : (
          <span
            data-adapttable-part="bulk-error"
            role="alert"
          >{`${labels.errorTitle}: ${errorMessage}`}</span>
        )
      }
      action={
        <Space size="small" wrap>
          <Button
            size="small"
            type="text"
            disabled={busy}
            onClick={selection.clear}
          >
            {labels.clearAll}
          </Button>
          {bulkActions.map((action) => (
            <Button
              data-adapttable-part="bulk-button"
              key={action.key}
              size="small"
              type="primary"
              danger={isDangerColor(action.color)}
              icon={action.icon}
              title={action.disabledReason?.(ids)}
              disabled={action.disabledReason?.(ids) !== undefined || busy}
              onClick={() => runner.run(action, ids, context)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      }
    />
  );
}
