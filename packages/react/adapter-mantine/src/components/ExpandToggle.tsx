import { ActionIcon } from "@mantine/core";

import { ChevronRightIcon } from "../icons";

/** Props for {@link ExpandToggle}. */
export interface ExpandToggleProps {
  /** Whether the row's detail panel is currently open. */
  expanded: boolean;
  /** Accessible label while collapsed. */
  expandLabel: string;
  /** Accessible label while expanded. */
  collapseLabel: string;
  /** Toggle the detail panel. */
  onToggle: () => void;
}

/**
 * The chevron that toggles a row's detail panel — shared by the desktop
 * table's leading cell and the mobile card. It is a real button, so the
 * row-click interactive-child guard already keeps it from activating
 * `onRowClick`.
 */
export function ExpandToggle({
  expanded,
  expandLabel,
  collapseLabel,
  onToggle,
}: Readonly<ExpandToggleProps>) {
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="sm"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={onToggle}
    >
      <ChevronRightIcon
        size={14}
        style={{
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
        }}
      />
    </ActionIcon>
  );
}
