/** Selection bar with the bulk actions and cross-page banner. */
import { useBulkActionRunner } from "@adapttable/react";
import {
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  offersAllMatching,
  resolveDisabledReason,
} from "@adapttable/react/adapter";
import { Button, Stack, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** Selection toolbar. */
export function BulkBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
}: Readonly<BulkBarChromeProps>) {
  const {
    selectedIds,
    selectedCount,
    visibleIds,
    allMatching,
    selectAllMatching,
    clear,
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
  // Offer "select all N matching" only when the whole page is selected and
  // more rows match beyond it; once active, show the cross-page scope.
  const showBanner = offersAllMatching(selection, total);
  return (
    <Stack
      data-adapttable-part="bulk-bar"
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        data-adapttable-part="select-all-banner"
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        <Typography variant="body2">
          {labels.selectedCount(selectedCount)}
        </Typography>
        {showBanner &&
          (allMatching ? (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                data-adapttable-part="select-all-text"
              >
                {labels.allMatchingSelected(total)}
              </Typography>
              <Button
                size="small"
                variant="text"
                data-adapttable-part="select-all-button"
                onClick={clear}
                disabled={pending !== null}
              >
                {labels.clearAll}
              </Button>
            </>
          ) : (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                data-adapttable-part="select-all-text"
              >
                {labels.pageSelected(visibleIds.length)}
              </Typography>
              <Button
                size="small"
                variant="text"
                data-adapttable-part="select-all-button"
                onClick={selectAllMatching}
                disabled={pending !== null}
              >
                {labels.selectAllMatching(total)}
              </Button>
            </>
          ))}
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="text"
          onClick={clear}
          disabled={pending !== null}
        >
          {labels.clearAll}
        </Button>
        {bulkActions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(ids));
          return (
            <Tooltip key={action.key} title={reason ?? ""}>
              <span>
                <Button
                  data-adapttable-part="bulk-button"
                  size="small"
                  variant="contained"
                  color={action.color as "primary" | undefined}
                  startIcon={action.icon as ReactNode}
                  disabled={reason !== undefined || pending !== null}
                  onClick={() =>
                    run(
                      action,
                      ids,
                      allMatching ? { allMatching: true, total } : undefined
                    )
                  }
                >
                  {action.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}
        {errorMessage !== null && (
          <Typography
            data-adapttable-part="bulk-error"
            variant="body2"
            color="error"
            role="alert"
          >
            {`${labels.errorTitle}: ${errorMessage}`}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
