/** Load failure, with a retry. */
import type { TableLabels } from "@adapttable/react/adapter";
import { Alert, Button } from "antd";

/** Error banner with optional retry. */
export function ErrorState({
  error,
  labels,
  onRetry,
}: Readonly<{
  error: Error;
  labels: Required<TableLabels>;
  onRetry?: () => void;
}>) {
  return (
    <Alert
      data-adapttable-part="error"
      type="error"
      showIcon
      title={labels.errorTitle}
      description={error.message}
      action={
        onRetry ? (
          <Button size="small" danger onClick={onRetry}>
            {labels.retry}
          </Button>
        ) : undefined
      }
    />
  );
}
