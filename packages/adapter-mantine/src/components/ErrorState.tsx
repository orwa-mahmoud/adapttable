import { Alert, Button, Group, Text } from "@mantine/core";

import { AlertIcon, RefreshIcon } from "../icons";

/**
 * Props for {@link ErrorState}.
 *
 * @public
 */
export interface ErrorStateProps {
  /** The error to surface. */
  error: Error;
  /** Title line. */
  title: string;
  /** Supporting message. */
  message: string;
  /** Retry button label. */
  retryLabel: string;
  /** Optional retry handler; the button is hidden when omitted. */
  onRetry?: () => void;
  /** Whether a retry is in flight. */
  isRetrying?: boolean;
}

/**
 * Inline error alert with an optional retry button.
 *
 * @public
 */
export function ErrorState({
  error,
  title,
  message,
  retryLabel,
  onRetry,
  isRetrying,
}: Readonly<ErrorStateProps>) {
  return (
    <Alert
      icon={<AlertIcon size={16} />}
      color="red"
      variant="light"
      title={title}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="md">
        <div>
          <Text fz="sm">{message}</Text>
          <Text fz="xs" c="dimmed" mt={2}>
            {error.message}
          </Text>
        </div>
        {onRetry && (
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<RefreshIcon size={14} />}
            onClick={onRetry}
            loading={isRetrying}
          >
            {retryLabel}
          </Button>
        )}
      </Group>
    </Alert>
  );
}
