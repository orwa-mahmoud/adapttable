import { MOBILE_BREAKPOINT_PX } from "@adapttable/core/binding";

import { useMediaQuery } from "./useMediaQuery";

/** The media query that matches the mobile layout at the default width. */
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

/**
 * The media query for a given mobile breakpoint.
 *
 * @param px - The width at or below which the card layout takes over.
 * @returns The query string.
 */
export function mobileMediaQuery(px: number): string {
  return px === MOBILE_BREAKPOINT_PX
    ? MOBILE_MEDIA_QUERY
    : `(max-width: ${String(px)}px)`;
}

/**
 * Whether the viewport is at or below the mobile breakpoint.
 *
 * The default is 768px — a phone in portrait. Raise it when the table lives
 * in a sidebar or a split pane, where the viewport says "desktop" but the
 * table has a phone's width to work with; lower it when the table is the
 * whole page and the columns are narrow enough to survive.
 *
 * @param px - The breakpoint in pixels. Defaults to 768.
 * @returns `true` on viewports at or below it.
 *
 * @public
 */
export function useIsMobile(px: number = MOBILE_BREAKPOINT_PX): boolean {
  return useMediaQuery(mobileMediaQuery(px));
}
