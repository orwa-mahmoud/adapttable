/** Loading skeleton for the table and the card list. */
import { HStack, Skeleton, Stack, VisuallyHidden } from "@chakra-ui/react";

/** Skeleton loading rows. */
export function LoadingState({
  rows,
  columns,
  loadingLabel,
}: Readonly<{ rows: number; columns: number; loadingLabel?: string }>) {
  return (
    <Stack
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="adapttable-loading"
    >
      {Array.from({ length: rows }, (_, r) => (
        <HStack key={r} gap={4}>
          {Array.from({ length: Math.max(columns, 1) }, (_, c) => (
            <Skeleton key={c} height="14px" width={c === 0 ? "30%" : "20%"} />
          ))}
        </HStack>
      ))}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </Stack>
  );
}
