/**
 * The chevron's footprint, on a row that has no chevron.
 *
 * A group footer and a "show more" row have nothing to collapse, so neither
 * renders a toggle — and without this they would start where the toggle would
 * have been, one control's width to the left of the header they belong to. On
 * a nested group that reads as the wrong indent level, which is exactly the
 * information the indent exists to carry.
 */
import type { ReactElement } from "react";

/**
 * Renders an inert element the size of a group's toggle button.
 *
 * @public
 */
export function GroupToggleSpacer(): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-adapttable-part="group-toggle-spacer"
      style={{ display: "inline-block", width: "1.5em", flexShrink: 0 }}
    />
  );
}
