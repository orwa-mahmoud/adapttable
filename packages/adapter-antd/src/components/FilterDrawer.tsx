/** The filters drawer — the backdrop-ed alternative to the popover. */
import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Drawer, Flex } from "antd";
import type { ReactNode } from "react";

/** Slide-over filter panel. */
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
      open={open}
      onClose={onClose}
      title={labels.filters}
      placement={dir === "rtl" ? "left" : "right"}
      size={360}
      footer={
        <div dir={dir}>
          <Flex justify="space-between">
            <Button disabled={activeFilterCount === 0} onClick={onClearFilters}>
              {labels.clearAll}
            </Button>
            <Button type="primary" onClick={onClose}>
              {labels.filtersDone}
            </Button>
          </Flex>
        </div>
      }
    >
      <div dir={dir}>{filters}</div>
    </Drawer>
  );
}
