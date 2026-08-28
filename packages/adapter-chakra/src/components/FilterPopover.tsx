import type { Direction, TableLabels } from "@adapttable/core";
import { Button, HStack, Popover, Stack, Text } from "@chakra-ui/react";
import { type ReactNode, useEffect, useRef } from "react";

import { KitPortal } from "./kitPortal";

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
  accentColor?: string;
  /** Writing direction, so the overlay opens on the correct side. */
  dir?: Direction;
  /** The Filters trigger button — becomes the popover anchor. */
  children: ReactNode;
}

/**
 * Anchored filter card (the default filter container). Opens under the Filters
 * button with no backdrop — the background stays visible and interactive;
 * clicking outside or pressing Escape closes it. Pair with
 * `filtersMode="drawer"` for the slide-in panel instead.
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
  const anchorRef = useRef<HTMLSpanElement>(null);

  // Ark's `closeOnEscape` restores focus only through `Popover.Trigger`, which
  // this layout doesn't use (the Filters button is an external anchor). Handle
  // Escape ourselves instead: close, then hand focus back to the trigger
  // inside the anchor — the same document-level pattern as the other adapters
  // (and, unlike Ark's browser-only restore, exercisable in jsdom).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      anchorRef.current?.querySelector("button")?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      positioning={{
        placement: dir === "rtl" ? "bottom-start" : "bottom-end",
        flip: false,
      }}
      closeOnInteractOutside
      closeOnEscape={false}
      lazyMount
      unmountOnExit
    >
      <Popover.Anchor asChild>
        <span ref={anchorRef} style={{ display: "inline-flex" }}>
          {children}
        </span>
      </Popover.Anchor>
      <KitPortal>
        <Popover.Positioner>
          <Popover.Content
            data-testid="adapttable-filter-popover"
            aria-label={labels.filters}
            w="380px"
            maxW="90vw"
            // Stops at the viewport edge: the form grows while open, and a
            // card taller than the window paints its lower fields off-screen.
            maxH="min(70vh, 560px)"
            overflowY="auto"
            dir={dir}
            zIndex="popover"
          >
            <Popover.Header border="0" pb={1}>
              <HStack justify="space-between" align="center">
                <Text fontWeight="semibold" fontSize="sm">
                  {labels.filters}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette={accentColor}
                  onClick={onClearFilters}
                  disabled={activeFilterCount === 0}
                >
                  {labels.clearAll}
                </Button>
              </HStack>
            </Popover.Header>
            <Popover.Body>
              <Stack gap={4}>{filters}</Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </KitPortal>
    </Popover.Root>
  );
}
