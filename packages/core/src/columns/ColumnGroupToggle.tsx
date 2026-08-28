import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "../types";
import type { HeaderGroupCell } from "./headerGroups";

/**
 * Props for an adapter `ColumnGroupToggle` — no slots on the public API.
 *
 * @internal
 */
export interface ColumnGroupToggleProps {
  /** The cell being rendered. */
  cell: HeaderGroupCell;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Called with the new state. */
  onToggle: (id: string) => void;
  /** Class for the element. */
  className?: string;
}

/**
 * Kit button the column-group chrome calls.
 *
 * @internal
 */
export interface ColumnGroupToggleButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Whether the section is open. */
  readonly expanded: boolean;
  /** Class for the element. */
  readonly className?: string;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Adapter-supplied controls for {@link ColumnGroupToggleChrome}.
 *
 * @internal
 */
export interface ColumnGroupToggleSlots {
  /** Renders a button. */
  readonly Button: (props: ColumnGroupToggleButtonProps) => ReactNode;
}

/**
 * Props for {@link ColumnGroupToggleChrome}.
 *
 * @internal
 */
export interface ColumnGroupToggleChromeProps extends ColumnGroupToggleProps {
  /** The kit's components for each part. */
  readonly slots: ColumnGroupToggleSlots;
}

/**
 * Collapse/expand control for one column-group header cell.
 *
 * @internal
 */
export function ColumnGroupToggleChrome({
  cell,
  labels,
  onToggle,
  className,
  slots,
}: Readonly<ColumnGroupToggleChromeProps>): ReactElement {
  const id = cell.id;
  if (!cell.collapsible || id === null) return <></>;
  const Button = slots.Button;
  return (
    <Button
      label={toggleLabel(cell, labels)}
      expanded={!cell.collapsed}
      className={className}
      onClick={() => onToggle(id)}
    />
  );
}

function toggleLabel(
  cell: HeaderGroupCell,
  labels: Required<TableLabels>
): string {
  const action = cell.collapsed
    ? labels.expandColumnGroup
    : labels.collapseColumnGroup;
  return cell.label ? `${action}: ${cell.label}` : action;
}
