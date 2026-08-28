import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "../types";
import type { HeaderGroupCell } from "./headerGroups";

/**
 * Props for an adapter `ColumnGroupToggle` — no slots on the public API.
 *
 * @public
 */
export interface ColumnGroupToggleProps {
  cell: HeaderGroupCell;
  labels: Required<TableLabels>;
  onToggle: (id: string) => void;
  className?: string;
}

/**
 * Kit button the column-group chrome calls.
 *
 * @public
 */
export interface ColumnGroupToggleButtonProps {
  readonly label: string;
  readonly expanded: boolean;
  readonly className?: string;
  readonly onClick: () => void;
}

/**
 * Adapter-supplied controls for {@link ColumnGroupToggleChrome}.
 *
 * @public
 */
export interface ColumnGroupToggleSlots {
  readonly Button: (props: ColumnGroupToggleButtonProps) => ReactNode;
}

/**
 * Props for {@link ColumnGroupToggleChrome}.
 *
 * @public
 */
export interface ColumnGroupToggleChromeProps extends ColumnGroupToggleProps {
  readonly slots: ColumnGroupToggleSlots;
}

/**
 * Collapse/expand control for one column-group header cell.
 *
 * @public
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
