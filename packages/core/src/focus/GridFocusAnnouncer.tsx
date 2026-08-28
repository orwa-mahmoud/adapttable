/**
 * The live region that says where keyboard focus went.
 *
 * A cell gaining DOM focus is announced by the screen reader on its own, but
 * only as the cell's contents — not which column it belongs to, and not where
 * it sits in a dataset the user cannot see the end of. "1,240" is useless;
 * "Budget, 1,240, row 40,002 of 100,000" is navigation.
 *
 * It lives in core rather than in eight adapters because the region's own
 * details are easy to get wrong — see {@link LiveRegion}, which owns them.
 */
import type { ReactElement } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { GridFocusState } from "./useGridFocus";

/**
 * Props for {@link GridFocusAnnouncer}.
 *
 * @internal
 */
export interface GridFocusAnnouncerProps {
  /** The grid focus state, straight from `table.gridFocus`. */
  focus: GridFocusState;
}

/**
 * Renders the grid's focus announcements, or nothing at all when cell
 * navigation is off — so an adapter spreads it unconditionally and the opt-in
 * promise still holds. When on, the region is present from the first render and
 * empty until focus moves, which is the order screen readers need.
 *
 * @internal
 */
export function GridFocusAnnouncer({
  focus,
}: Readonly<GridFocusAnnouncerProps>): ReactElement | null {
  if (!focus.enabled) return null;
  return <LiveRegion part="grid-announcer">{focus.announcement}</LiveRegion>;
}
