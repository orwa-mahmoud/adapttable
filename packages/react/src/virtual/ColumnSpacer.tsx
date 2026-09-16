/**
 * The cell that holds open the columns outside the horizontal window.
 *
 * It is one empty cell per side, sized to everything the window skipped, so
 * the table's scroll width matches the columns it claims to have. Aria-hidden
 * because it is scaffolding, not data — a screen reader walking the row would
 * otherwise meet two blank cells whose only job is width.
 */
import type { ReactElement } from "react";

/**
 * Props for {@link ColumnSpacer}.
 *
 * @public
 */
export interface ColumnSpacerProps {
  /** Pixel width of the columns this cell stands in for. */
  width: number;
  /** Which side of the window it sits on, for the part name. */
  side: "start" | "end";
  /** The element to render — a kit's own cell component, or `"td"`. */
  as?: "td" | "th";
}

/**
 * Renders the spacer, or nothing when there is nothing to hold open.
 *
 * @public
 */
export function ColumnSpacer({
  width,
  side,
  as = "td",
}: Readonly<ColumnSpacerProps>): ReactElement | null {
  if (width <= 0) return null;
  const Cell = as;
  return (
    <Cell
      aria-hidden="true"
      data-adapttable-part={`column-spacer-${side}`}
      style={{ width, minWidth: width, padding: 0, border: 0 }}
    />
  );
}
