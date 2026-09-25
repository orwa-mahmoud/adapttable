/** The row-expansion chevron, shared by rows and cards. */
import type { Direction, TableLabels } from "@adapttable/core";
import { ExpandChevron } from "@adapttable/react/adapter";

import { IconButton } from "../ui";

/** Chevron toggle for a row's detail panel. */
export function ExpandToggle({
  open,
  dir,
  labels,
  onToggle,
}: Readonly<{
  open: boolean;
  dir?: Direction;
  labels: Pick<Required<TableLabels>, "expandRow" | "collapseRow">;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="1"
      variant="ghost"
      color="gray"
      aria-expanded={open}
      aria-label={open ? labels.collapseRow : labels.expandRow}
      onClick={onToggle}
    >
      <ExpandChevron open={open} dir={dir} />
    </IconButton>
  );
}
