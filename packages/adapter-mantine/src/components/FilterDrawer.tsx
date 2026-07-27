import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Drawer, Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";

/** Props for {@link FilterDrawer}. */
export interface FilterDrawerProps {
  opened: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  /** Clear-filters handler (always supplied by the table chrome). */
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  dir?: Direction;
}

/** Right-side drawer holding the caller's filter widgets + apply/clear. */
export function FilterDrawer({
  opened,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
}: Readonly<FilterDrawerProps>) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position={dir === "rtl" ? "left" : "right"}
      size={380}
      title={labels.filters}
      overlayProps={{ opacity: 0.4, blur: 2 }}
      closeButtonProps={{ "aria-label": labels.cancel }}
    >
      <Stack gap="md" mih="60vh" justify="space-between">
        <Stack gap="md">{filters}</Stack>
        <Group justify="space-between" pt="md">
          <Button
            variant="subtle"
            onClick={onClearFilters}
            disabled={activeFilterCount === 0}
          >
            {labels.clearAll}
          </Button>
          <Button onClick={onClose}>{labels.filtersDone}</Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
