import {
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "@adapttable/core/adapter";
import { Box, Typography } from "@mui/material";

import { statsSlots } from "./SelectionStatsBar";

const slots: StatusBarSlots = {
  Bar: ({ items, stats, className }: StatusBarSlotProps) => (
    <Box
      className={className}
      data-adapttable-part="status-bar"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 16px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {items.map((item) => (
        <Typography
          component="span"
          key={item.key}
          variant="caption"
          color="text.secondary"
          data-adapttable-part="status-item"
          data-status={item.key}
          data-appearance={item.appearance}
        >
          {item.text}
        </Typography>
      ))}
      {stats}
    </Box>
  ),
  stats: statsSlots,
};

/** The kit's status bar: row counts, selection count, selection figures. */
export function StatusBar(
  props: Readonly<Omit<StatusBarChromeProps, "slots">>
) {
  return <StatusBarChrome {...props} slots={slots} />;
}
