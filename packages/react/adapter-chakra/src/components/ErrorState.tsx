/** Load failure, with a retry. */
import type { TableLabels } from "@adapttable/core";
import { Alert, Button } from "@chakra-ui/react";

/** Error alert with retry. */
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
    <Alert.Root role="alert" status="error" borderRadius="md">
      <Alert.Indicator />
      <Alert.Content flex="1">
        <Alert.Title fontWeight="bold">{labels.errorTitle}</Alert.Title>
        <Alert.Description fontSize="sm">{error.message}</Alert.Description>
      </Alert.Content>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          {labels.retry}
        </Button>
      )}
    </Alert.Root>
  );
}
