import type { Direction, TableLabels } from "@adapttable/core";
import { Popover } from "@base-ui/react/popover";
import { isValidElement, type ReactElement, type ReactNode } from "react";

import type { BaseUiAccentColor } from "../types";
import { Button, Flex, Text } from "../ui";

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
  accentColor?: BaseUiAccentColor;
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
  const trigger = isValidElement(children) ? (
    <Popover.Trigger render={children as ReactElement} />
  ) : (
    <Popover.Trigger>{children}</Popover.Trigger>
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {trigger}
      <Popover.Portal>
        <Popover.Positioner
          className="adapttable-popup-positioner"
          side="bottom"
          align={dir === "rtl" ? "start" : "end"}
          sideOffset={8}
          // The filter form GROWS while it is open (picking the "between"
          // operator reveals a second bound input). With the default
          // flip behaviour Base UI answered that by throwing the whole
          // panel above the trigger — it covered the page header and the
          // control the user had just clicked. Keep the side pinned to
          // `bottom` (`side: "none"`) and only shift horizontally.
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
        >
          <Popover.Popup
            data-testid="adapttable-filter-popover"
            aria-label={labels.filters}
            dir={dir}
            className="adapttable-popup"
            style={{
              width: 380,
              maxWidth: "90vw",
              maxHeight: "min(70vh, 560px)",
              overflowY: "auto",
            }}
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
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
