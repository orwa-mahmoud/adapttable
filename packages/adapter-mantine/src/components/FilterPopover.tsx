import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Group, Popover, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

/** Props for {@link FilterPopover}. */
export interface FilterPopoverProps {
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  /** Clear-filters handler (always supplied by the table chrome). */
  onClearFilters: () => void;
  labels: Required<TableLabels>;
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
  return (
    <Popover
      opened={open}
      onDismiss={onClose}
      returnFocus
      position={dir === "rtl" ? "bottom-start" : "bottom-end"}
      withinPortal
      shadow="md"
      radius="md"
      width={340}
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown>
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
  );
}
