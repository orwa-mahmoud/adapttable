import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "@adapttable/core/adapter";
import { Box, Typography } from "@mui/material";

function Stats({ parts, className }: SelectionStatsSlotProps) {
  return (
    <Box
      component="output"
      className={className}
      data-adapttable-part="selection-stats"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 16px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {parts.map((part) => (
        <Typography
          component="span"
          key={part.key}
          variant="caption"
          color="text.secondary"
          data-adapttable-part="selection-stat"
        >
          {part.text}
        </Typography>
      ))}
    </Box>
  );
}

/** The kit's stats rendering, shared with the status bar that hosts it. */
export const statsSlots: SelectionStatsSlots = { Stats };

/**
 * MUI-owned status bar for the headless selection statistics.
 *
 * @public
 */
export function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={statsSlots} />;
}
