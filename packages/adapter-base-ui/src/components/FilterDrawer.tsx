/** The filters drawer — the backdrop-ed alternative to the popover. */
import type { Direction, TableLabels } from "@adapttable/core";
import { Drawer } from "@base-ui/react/drawer";
import { type ReactNode } from "react";

import type { BaseUiAccentColor } from "../types";
import { Button, Flex } from "../ui";

/** Filters drawer — Base UI Drawer pinned to the inline-end edge. */
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
  accentColor?: BaseUiAccentColor;
  dir?: Direction;
}>) {
  return (
    <Drawer.Root
      open={open}
      swipeDirection={dir === "rtl" ? "left" : "right"}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop
          className="adapttable-drawer-backdrop"
          data-testid="adapttable-filter-drawer-backdrop"
        />
        <Drawer.Viewport>
          <Drawer.Popup className="adapttable-drawer" dir={dir}>
            <Drawer.Content className="adapttable-drawer-content">
              <Drawer.Title className="adapttable-drawer-title">
                {labels.filters}
              </Drawer.Title>
              <Flex
                direction="column"
                gap="4"
                mt="3"
                style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
              >
                {filters}
              </Flex>
              <Flex
                justify="between"
                style={{
                  flexShrink: 0,
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--adapttable-border)",
                }}
              >
                <Button
                  variant="ghost"
                  color="gray"
                  onClick={onClearFilters}
                  disabled={activeFilterCount === 0}
                >
                  {labels.clearAll}
                </Button>
                <Button color={accentColor} variant="solid" onClick={onClose}>
                  {labels.filtersDone}
                </Button>
              </Flex>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
