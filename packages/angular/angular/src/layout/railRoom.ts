/**
 * The room the table's rails take, measured in the browser.
 *
 * The expand, reorder, selection and actions rails render at their kit's
 * width, which no declared column width describes. The desktop structure
 * measures them and writes the total to this custom property on the table,
 * and the table's minimum width adds it, so sized columns keep their widths
 * and the table scrolls sideways instead of squeezing them.
 */
import type { CssProperties } from "@adapttable/core";

/** The custom property that holds the rails' measured width. */
export const RAIL_ROOM_PROPERTY = "--at-rails";

/**
 * A table style whose minimum width also holds the measured rails.
 *
 * @param style - The style the declared column widths give the table.
 * @returns The same style; a pixel minimum width gains the rails' width.
 */
export function withRailRoom(
  style: CssProperties | undefined
): CssProperties | undefined {
  const minWidth = style?.minWidth;
  if (typeof minWidth !== "number") return style;
  return {
    ...style,
    minWidth: `calc(${String(minWidth)}px + var(${RAIL_ROOM_PROPERTY}, 0px))`,
  };
}
