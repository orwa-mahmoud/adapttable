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
}: Readonly<{ rows: number; columns: number; loadingLabel?: string }>) {
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="adapttable-loading"
    >
      {Array.from({ length: rows }, (_, r) => (
        <Stack key={r} direction="row" spacing={2} sx={{ py: 1 }}>
          {Array.from({ length: Math.max(columns, 1) }, (_, c) => (
            <Skeleton key={c} variant="text" width={c === 0 ? "30%" : "20%"} />
          ))}
        </Stack>
      ))}
      {loadingLabel ? (
        <Box component="span" sx={srOnly}>
          {loadingLabel}
        </Box>
      ) : null}
    </Box>
  );
}
