/**
 * Desktop table assembly.
 *
 * Row wiring, sticky placement and header leaves live in their own modules.
 * This file re-exports them so existing imports keep the same names.
 */

export type {
  DesktopHeaderLeafContext,
  LeafColumn,
  LeafSortProps,
} from "./desktopHeader";
export {
  absoluteColumnIndex,
  columnHeaderControllerFor,
  desktopHeaderLeaf,
  headerSortDir,
} from "./desktopHeader";
export type {
  DesktopBodySlotsInput,
  DesktopRowPinPart,
  DesktopRowWiringArgs,
  DesktopRowWiringContext,
  DesktopRowWiringModel,
  WiringReorder,
} from "./desktopRowModel";
export {
  DESKTOP_ROW_WIRING_KEYS,
  desktopBodySlots,
  desktopRowDomProps,
  desktopRowWiring,
  desktopRowWiringEqual,
} from "./desktopRowModel";
export type { DesktopStickyPlan } from "./desktopSticky";
export {
  desktopEdgeBodyStyle,
  desktopEdgeHeadStyle,
  desktopHeadCellStyle,
  desktopPinEdges,
  desktopStickyPlan,
  desktopTableStyle,
} from "./desktopSticky";
