/** Loading skeleton for the table and the card list. */
import { Box, Skeleton, Stack } from "@mui/material";

/** Inline equivalent of `@mui/utils` visuallyHidden (avoids an extra dep). */
const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/** Skeleton loading placeholder. */
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
      <Skeleton key={c} variant="text" width={c === 0 ? "30%" : "20%"} />
    ));
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-adapttable-part="loading"
      data-testid="adapttable-loading"
    >
      {mobile ? (
        <Box data-adapttable-part="loading-cards">
          {Array.from({ length: rows }, (_, r) => (
            <Stack
              key={r}
              data-adapttable-part="loading-card"
              spacing={1}
              sx={{ py: 1 }}
            >
              {bars()}
            </Stack>
          ))}
        </Box>
      ) : (
        <Box data-adapttable-part="loading-table">
          {Array.from({ length: rows }, (_, r) => (
            <Stack key={r} direction="row" spacing={2} sx={{ py: 1 }}>
              {bars()}
            </Stack>
          ))}
        </Box>
      )}
      {loadingLabel ? (
        <Box component="span" sx={srOnly}>
          {loadingLabel}
        </Box>
      ) : null}
    </Box>
  );
}
