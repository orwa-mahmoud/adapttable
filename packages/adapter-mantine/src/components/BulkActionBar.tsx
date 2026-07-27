import {
  type BulkAction,
  type SelectionState,
  type TableLabels,
  useBulkActionRunner,
} from "@adapttable/core";
import {
  bulkActionErrorMessage,
  type BulkBarChromeProps,
  resolveDisabledReason,
} from "@adapttable/core/adapter";
import { Button, Group, Stack, Text, Tooltip } from "@mantine/core";

/** Selection toolbar: count, clear, and the configured bulk-action buttons. */
export function BulkActionBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
}: Readonly<BulkBarChromeProps>) {
  const { selectedIds, selectedCount, clear, allMatching } = selection;
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
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text fz="sm">{labels.selectedCount(selectedCount)}</Text>
        <Group gap="xs" wrap="wrap">
          <Button
            size="xs"
            variant="subtle"
            onClick={clear}
            disabled={pending !== null}
          >
            {labels.clearAll}
          </Button>
          {bulkActions.map((action) => (
            <BulkButton
              key={action.key}
              action={action}
              ids={ids}
              pending={pending}
              onRun={(a) => {
                // Widened scope: the action receives the page ids plus the
                // all-matching context, so confirm counts size by `total`.
                if (allMatching) run(a, ids, { allMatching: true, total });
                else run(a, ids);
              }}
            />
          ))}
        </Group>
      </Group>
      <ScopeBanner selection={selection} total={total} labels={labels} />
      {errorMessage !== null && (
        <Text fz="sm" c="red" role="alert">
          {`${labels.errorTitle}: ${errorMessage}`}
        </Text>
      )}
    </Stack>
  );
}

/**
 * Gmail-style scope banner. When every row on the page is selected but more
 * rows match elsewhere, offer to widen the selection to all matching rows;
 * once widened, announce the scope and offer to clear it.
 */
function ScopeBanner({
  selection,
  total,
  labels,
}: Readonly<{
  selection: SelectionState;
  total: number;
  labels: Required<TableLabels>;
}>) {
  if (selection.headerState !== "all" || total <= selection.visibleIds.length) {
    return null;
  }
  return (
    <Group role="status" gap="xs" wrap="wrap">
      {selection.allMatching ? (
        <>
          <Text fz="sm">{labels.allMatchingSelected(total)}</Text>
          <Button size="xs" variant="subtle" onClick={selection.clear}>
            {labels.clearAll}
          </Button>
        </>
      ) : (
        <>
          <Text fz="sm">{labels.pageSelected(selection.selectedCount)}</Text>
          <Button
            size="xs"
            variant="light"
            onClick={selection.selectAllMatching}
          >
            {labels.selectAllMatching(total)}
          </Button>
        </>
      )}
    </Group>
  );
}

function BulkButton({
  action,
  ids,
  pending,
  onRun,
}: Readonly<{
  action: BulkAction;
  ids: string[];
  pending: string | null;
  onRun: (action: BulkAction) => void;
}>) {
  const reason = resolveDisabledReason(action.disabledReason?.(ids));
  const ineligible = reason !== undefined;
  const button = (
    <Button
      size="xs"
      color={action.color}
      leftSection={action.icon}
      onClick={() => onRun(action)}
      loading={pending === action.key}
      disabled={ineligible || (pending !== null && pending !== action.key)}
    >
      {action.label}
    </Button>
  );
  if (reason !== undefined) {
    return (
      <Tooltip label={reason} withArrow openDelay={150}>
        <div>{button}</div>
      </Tooltip>
    );
  }
  return button;
}
