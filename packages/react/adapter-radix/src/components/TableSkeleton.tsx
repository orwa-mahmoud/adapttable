/** Loading skeleton for the table and the card list. */
import { Flex, Skeleton, VisuallyHidden } from "@radix-ui/themes";

/** Skeleton loading rows. */
export function LoadingState({
  rows,
  columns,
  loadingLabel,
}: Readonly<{ rows: number; columns: number; loadingLabel?: string }>) {
  return (
    <Flex
      direction="column"
      gap="2"
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="adapttable-loading"
    >
      {Array.from({ length: rows }, (_, r) => (
        <Flex key={r} gap="4">
          {Array.from({ length: Math.max(columns, 1) }, (_, c) => (
            <Skeleton key={c} height="14px" width={c === 0 ? "30%" : "20%"} />
          ))}
        </Flex>
      ))}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </Flex>
  );
}
