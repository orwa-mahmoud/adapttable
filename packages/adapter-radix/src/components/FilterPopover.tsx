import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Flex, Popover, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

import type { RadixAccentColor } from "../types";

/** Props for {@link FilterPopover}. */
export interface FilterPopoverProps {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Closes the overlay. Filters apply live, so this only dismisses it. */
  onClose: () => void;
  /** The filter fields to render inside. */
  filters: ReactNode;
  /** How many filters are currently set, for the header count. */
  activeFilterCount: number;
  /** Clears every active filter. */
  onClearFilters: () => void;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** The kit's accent, so the overlay matches the table. */
  accentColor?: RadixAccentColor;
  /** Writing direction, so the overlay opens on the correct side. */
  dir?: Direction;
  /** The Filters trigger button — becomes the popover anchor. */
  children: ReactNode;
}

/**
 * Anchored filter card (the default filter container). Opens under the Filters
 * button with no backdrop — the background stays visible and interactive;
 * clicking outside or pressing Escape closes it. Pair with
 * `filtersMode="drawer"` for the modal panel instead.
 */
export function FilterPopover({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  accentColor,
  dir = "ltr",
  children,
}: Readonly<FilterPopoverProps>) {
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Popover.Trigger>{children}</Popover.Trigger>
      <Popover.Content
        data-testid="adapttable-filter-popover"
        aria-label={labels.filters}
        align={dir === "rtl" ? "start" : "end"}
        side="bottom"
        avoidCollisions={false}
        width="380px"
        maxWidth="90vw"
        dir={dir}
        // The form GROWS while open (the "between" operator reveals a second
        // bound input), and collision handling answered that by flipping the
        // whole panel above the trigger, covering the page header and the
        // control just clicked. The `maxHeight` below now caps the panel to the
        // room actually under the trigger, so it always fits and never flips —
        // which lets collision handling stay ON for the OTHER axis, where it is
        // the only thing stopping a 380px panel running off the side of the
        // screen. Under RTL it hung 136px past the left edge without it.
        collisionPadding={8}
        // Pinned below the trigger, the panel must stop at the viewport edge
        // or its lower half becomes unreachable — an inner scrollbar cannot
        // rescue content that is painted off-screen. Radix publishes the room
        // it measured under the trigger; take the smaller of that and our own
        // cap, minus a little breathing room at the bottom.
        maxHeight="min(70vh, 560px, calc(var(--radix-popper-available-height) - 8px))"
        style={{ overflowY: "auto", zIndex: 10050 }}
      >
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Text weight="bold" size="2">
              {labels.filters}
            </Text>
            <Button
              size="1"
              variant="ghost"
              color={accentColor}
              onClick={onClearFilters}
              disabled={activeFilterCount === 0}
            >
              {labels.clearAll}
            </Button>
          </Flex>
          <Flex direction="column" gap="4">
            {filters}
          </Flex>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
