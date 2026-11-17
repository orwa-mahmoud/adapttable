/** Loading skeleton for the table and the card list. */
import { Flex, Skeleton, VisuallyHidden } from "../ui";

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
    <output
      className="adapttable-flex"
      style={{ flexDirection: "column", gap: "0.5rem", display: "flex" }}
      aria-busy="true"
      aria-live="polite"
      data-adapttable-part="loading"
      data-testid="adapttable-loading"
    >
      {mobile ? (
        <div data-adapttable-part="loading-cards">
          {Array.from({ length: rows }, (_, r) => (
            <Flex
              key={r}
              direction="column"
              gap="2"
              data-adapttable-part="loading-card"
            >
              {bars()}
            </Flex>
          ))}
        </div>
      ) : (
        <div data-adapttable-part="loading-table">
          {Array.from({ length: rows }, (_, r) => (
            <Flex key={r} gap="4">
              {bars()}
            </Flex>
          ))}
        </div>
      )}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </output>
  );
}
