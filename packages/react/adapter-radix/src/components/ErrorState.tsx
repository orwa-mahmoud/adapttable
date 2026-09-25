/** Load failure, with a retry. */
import type { TableLabels } from "@adapttable/core";
import { Box, Button, Callout, Text } from "@radix-ui/themes";

/** Error callout with retry. */
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
    <Callout.Root color="red" role="alert">
      <Callout.Text>
        <Text weight="bold">{labels.errorTitle}</Text> — {error.message}
      </Callout.Text>
      {onRetry && (
        <Box mt="2">
          <Button size="1" color="red" variant="soft" onClick={onRetry}>
            {labels.retry}
          </Button>
        </Box>
      )}
    </Callout.Root>
  );
}
