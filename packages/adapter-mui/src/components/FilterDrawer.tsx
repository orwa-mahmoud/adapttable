/** The filters drawer — the backdrop-ed alternative to the popover. */
import type { Direction, TableLabels } from "@adapttable/core";
import { Box, Button, Drawer, Stack, Typography } from "@mui/material";
import { type ReactNode } from "react";

/** Filters drawer. */
export function FilterDrawer({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  dir?: Direction;
}>) {
  return (
    <Drawer
      anchor={dir === "rtl" ? "left" : "right"}
      open={open}
      onClose={onClose}
      slotProps={{ paper: { "aria-label": labels.filters, dir } }}
    >
      <Box
        sx={{
          width: 360,
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
        }}
      >
        <Typography variant="h6">{labels.filters}</Typography>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {filters}
        </Box>
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Button onClick={onClearFilters} disabled={activeFilterCount === 0}>
            {labels.clearAll}
          </Button>
          <Button variant="contained" onClick={onClose}>
            {labels.filtersDone}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
