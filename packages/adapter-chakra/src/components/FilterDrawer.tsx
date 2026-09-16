/** The filters drawer — the backdrop-ed alternative to the popover. */
import type { Direction, TableLabels } from "@adapttable/core";
import { Button, CloseButton, Drawer, Stack } from "@chakra-ui/react";
import { type ReactNode } from "react";

import { KitPortal } from "./kitPortal";

/** Filters drawer. */
export function FilterDrawer({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  accentColor,
  dir = "ltr",
}: Readonly<{
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  accentColor?: string;
  dir?: Direction;
}>) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement={dir === "rtl" ? "start" : "end"}
      size="sm"
    >
      <KitPortal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            dir={dir}
            h="100dvh"
            display="flex"
            flexDirection="column"
          >
            <Drawer.CloseTrigger asChild>
              <CloseButton aria-label={labels.cancel} />
            </Drawer.CloseTrigger>
            <Drawer.Header>{labels.filters}</Drawer.Header>
            <Drawer.Body flex="1" overflowY="auto">
              <Stack gap={4}>{filters}</Stack>
            </Drawer.Body>
            <Drawer.Footer justifyContent="space-between">
              <Button
                variant="ghost"
                onClick={onClearFilters}
                disabled={activeFilterCount === 0}
              >
                {labels.clearAll}
              </Button>
              <Button colorPalette={accentColor} onClick={onClose}>
                {labels.filtersDone}
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </KitPortal>
    </Drawer.Root>
  );
}
