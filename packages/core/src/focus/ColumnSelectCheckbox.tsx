import type { ReactNode } from "react";
import { useState } from "react";

import { useMediaQuery } from "../hooks/useMediaQuery";

/**
 * A pointer that can hover — a mouse or a trackpad.
 *
 * Matched rather than assumed, because it is the whole reason this control
 * exists: where hovering is possible the checkbox stays out of the way until
 * it is wanted, and where it is not, there is no hover to wait for and no
 * Ctrl key to hold either, so the checkbox is simply there.
 */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * The kit checkbox {@link ColumnSelectCheckboxChrome} calls.
 *
 * @public
 */
export interface ColumnSelectCheckboxProps {
  /** Accessible name, already localized and already naming the column. */
  readonly label: string;
  /** Whether this column is the selection. */
  readonly checked: boolean;
  /** Select this column, or clear the selection when it already is. */
  readonly onToggle: () => void;
}

/**
 * Adapter-supplied control for {@link ColumnSelectCheckboxChrome}.
 *
 * @public
 */
export interface ColumnSelectSlots {
  /** Renders a checkbox. */
  readonly Checkbox: (props: ColumnSelectCheckboxProps) => ReactNode;
}

/**
 * Props for {@link ColumnSelectCheckboxChrome}.
 *
 * @public
 */
export interface ColumnSelectCheckboxChromeProps {
  /** Accessible name for the control, already localized. */
  readonly label: string;
  /** Whether this column is the selection. */
  readonly checked: boolean;
  /** Select this column, or clear the selection when it already is. */
  readonly onToggle: () => void;
  /** `classNames.columnSelect`, for the kits that carry per-part classes. */
  readonly className?: string;
  /** The kit's checkbox. */
  readonly slots: ColumnSelectSlots;
}

/**
 * The header checkbox that selects a whole column.
 *
 * Ctrl/Cmd+click on a header is the gesture, and it is unchanged. This is the
 * same state reached two other ways: by a finger, which has no modifier key to
 * hold, and by a screen reader, which has no way to discover a gesture nothing
 * announces.
 *
 * Core owns the structure, the part name, the accessible name and the two
 * things that stop the control from fighting the header it sits in:
 *
 * - **Clicks do not reach the header.** A sortable header sorts on click and a
 *   plain header selects on click; either would fire underneath the checkbox
 *   and undo what ticking it just did.
 * - **Keys do not reach the grid.** Space on a checkbox toggles it. Space on a
 *   cell belongs to the grid, and the two are the same keystroke.
 *
 * On a hovering pointer the box holds its space and fades in on hover or focus,
 * so a table of twelve columns is not a row of twelve checkboxes; the layout
 * never moves, and a selected column shows its state whether or not the pointer
 * is near. Where there is no hover, it is always visible.
 *
 * @public
 */
export function ColumnSelectCheckboxChrome({
  label,
  checked,
  onToggle,
  className,
  slots,
}: Readonly<ColumnSelectCheckboxChromeProps>) {
  const Checkbox = slots.Checkbox;
  const canHover = useMediaQuery(HOVER_QUERY);
  const [near, setNear] = useState(false);
  // Opacity, not mounting: an element that appears on hover has to be hovered
  // to appear. It keeps its box, so there is something to aim at, and the
  // header's width does not change when the pointer arrives.
  const shown = !canHover || near || checked;
  return (
    <span
      // The span positions and reveals; the checkbox inside carries every bit
      // of the semantics. `none` — ARIA's current spelling of the
      // presentational role — is what lets it hold the two containment
      // handlers below without pretending to be a control itself.
      role="none"
      data-adapttable-part="column-select"
      data-shown={shown ? "" : undefined}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        opacity: shown ? 1 : 0,
        transition: "opacity 120ms ease",
      }}
      onPointerEnter={() => setNear(true)}
      onPointerLeave={() => setNear(false)}
      onFocus={() => setNear(true)}
      onBlur={() => setNear(false)}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <Checkbox label={label} checked={checked} onToggle={onToggle} />
    </span>
  );
}

/**
 * The checkbox's accessible name: what it does, and which column.
 *
 * "Select column" twelve times over names nothing — a screen reader user
 * hearing it has no idea which column is about to be selected.
 *
 * @public
 */
export function columnSelectLabel(
  label: string | undefined,
  column: { header?: ReactNode; key: string }
): string {
  const name = typeof column.header === "string" ? column.header : column.key;
  return `${label ?? "Select column"}: ${name}`;
}
