/** Load failure, with a retry. */
import type { TableLabels } from "@adapttable/core";
import { Alert, Button } from "@mui/material";

/** Error alert. */
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
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            {labels.retry}
          </Button>
        ) : undefined
      }
    >
      <strong>{labels.errorTitle}</strong> — {error.message}
    </Alert>
  );
}
