/** Loading skeleton for the table and the card list. */
import { HStack, Skeleton, Stack, VisuallyHidden } from "@chakra-ui/react";

/** Skeleton loading rows. */
export function LoadingState({
  rows,
  columns,
  loadingLabel,
  mobile = false,
}: Readonly<{
  rows: number;
  columns: number;
  loadingLabel?: string;
  mobile?: boolean;
}>) {
  const lineCount = mobile
    ? Math.min(4, Math.max(columns, 1))
    : Math.max(columns, 1);
  const bars = () =>
    Array.from({ length: lineCount }, (_, c) => (
      <Skeleton key={c} height="14px" width={c === 0 ? "30%" : "20%"} />
    ));
  return (
    <Stack
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-adapttable-part="loading"
      data-testid="adapttable-loading"
    >
      {mobile ? (
        <Stack data-adapttable-part="loading-cards">
          {Array.from({ length: rows }, (_, r) => (
            <Stack key={r} data-adapttable-part="loading-card">
              {bars()}
            </Stack>
          ))}
        </Stack>
      ) : (
        <Stack data-adapttable-part="loading-table">
          {Array.from({ length: rows }, (_, r) => (
            <HStack key={r} gap={4}>
              {bars()}
            </HStack>
          ))}
        </Stack>
      )}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </Stack>
  );
}
