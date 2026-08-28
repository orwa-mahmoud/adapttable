import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Drawer, Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * Props for {@link FilterDrawer}.
 *
 * @public
 */
export interface FilterDrawerProps {
  /** Whether the drawer is showing. */
  opened: boolean;
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
}

/**
 * Side drawer holding the caller's filter widgets + a pinned apply/clear bar.
 *
 * @public
 */
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
      // Force LTR on the shell: Mantine 9 pins with flex-start/end, so a
      // rtl dir here moves "left" to the physical right. Header/body still
      // flip so the title, close, and fields read correctly.
      dir="ltr"
      styles={{
        header: { direction: dir, flexShrink: 0 },
        content: {
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        body: {
          direction: dir,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack gap={0} style={{ flex: 1, minHeight: 0, height: "100%" }}>
        <Stack
          gap="md"
          style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
          pb="md"
        >
          {filters}
        </Stack>
        <Group
          justify="space-between"
          pt="md"
          style={{
            flexShrink: 0,
            borderTop: "1px solid var(--mantine-color-default-border)",
          }}
        >
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
