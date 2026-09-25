/** Load failure, with a retry. */
import type { TableLabels } from "@adapttable/core";

import type { DataTableClassNames } from "../types";

/** Inline error with optional retry. */
export function ErrorState({
  error,
  labels,
  onRetry,
  classNames,
}: Readonly<{
  error: Error;
  labels: Required<TableLabels>;
  onRetry?: () => void;
  classNames: DataTableClassNames;
}>) {
  return (
    <div role="alert" data-adapttable-part="error" className={classNames.error}>
      <strong>{labels.errorTitle}</strong>
      <p>{labels.errorMessage}</p>
      <small>{error.message}</small>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          data-adapttable-part="retry-button"
          className={classNames.retryButton}
        >
          {labels.retry}
        </button>
      )}
    </div>
  );
}
