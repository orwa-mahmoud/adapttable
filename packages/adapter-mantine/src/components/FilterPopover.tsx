import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Group, Popover, Stack, Text } from "@mantine/core";
import { type ReactNode, useEffect, useRef } from "react";

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
  /** Clear-filters handler (always supplied by the table chrome). */
  onClearFilters: () => void;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Writing direction, so the overlay opens on the correct side. */
  dir?: Direction;
  /** The Filters trigger button — becomes the popover anchor. */
  children: ReactNode;
}

/**
 * Anchored filter card (the default filter container). Opens under the Filters
 * button and tracks it on scroll. No backdrop — the background stays visible
 * and interactive; clicking outside or pressing Escape closes it. Pair with
 * `filtersMode="drawer"` for the slide-in panel instead.
 */
export function FilterPopover({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
  children,
}: Readonly<FilterPopoverProps>) {
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        anchorRef.current?.contains(target) ||
        (target instanceof Element &&
          target.closest(
            ".mantine-Popover-dropdown, .mantine-Combobox-dropdown"
          ))
      ) {
        return;
      }
      onClose();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onOutsidePress);
    document.addEventListener("touchstart", onOutsidePress);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutsidePress);
      document.removeEventListener("touchstart", onOutsidePress);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, onClose]);

  return (
    <span ref={anchorRef} style={{ display: "contents" }}>
      <Popover
        opened={open}
        onChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
        closeOnClickOutside={false}
        returnFocus
        position={dir === "rtl" ? "bottom-start" : "bottom-end"}
        middlewares={{
          shift: { padding: 8, mainAxis: false },
          flip: false,
          size: {
            padding: 8,
            apply: ({ availableHeight, elements }) => {
              elements.floating.style.maxHeight = `${Math.min(
                560,
                availableHeight
              )}px`;
            },
          },
        }}
        withinPortal
        zIndex={10050}
        shadow="md"
        radius="md"
        width={380}
      >
        <Popover.Target>{children}</Popover.Target>
        {/* The form grows while open (the "between" operator reveals a second
            bound), and with enough filters it outgrows the window. Pinned below
            the trigger, the panel has to stop at the viewport edge or its lower
            fields are painted off-screen and cannot be reached — a scroll to
            reach them dismisses the popover instead. */}
        <Popover.Dropdown
          // The card portals to `<body>`, so it loses the table's direction
          // unless we hand it over — same reason ColumnMenu sets `dir` here.
          dir={dir}
          mah="min(70vh, 560px)"
          maw="calc(100vw - 32px)"
          style={{ overflowY: "auto" }}
        >
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={600} fz="sm">
              {labels.filters}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={onClearFilters}
              disabled={activeFilterCount === 0}
            >
              {labels.clearAll}
            </Button>
          </Group>
          <Stack gap="md">{filters}</Stack>
        </Popover.Dropdown>
      </Popover>
    </span>
  );
}
