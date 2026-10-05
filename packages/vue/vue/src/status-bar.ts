export type * from "./index";
export { SELECTION_STATS_MODEL } from "./navigation/contracts";
export { selectionStats, statusBar } from "./navigation/features";
export {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlots,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "./navigation/navigationChrome";
export type { SelectionStats, SelectionStatsOptions } from "@adapttable/core";
export type {
  SelectionStatPart,
  SelectionStatsSlotProps,
  StatusBarItem,
} from "@adapttable/core/binding";
export { STATUS_BAR } from "@adapttable/core/binding";

/** Preserve the existing core type-only surface through declaration bundling. */
export type * from "@adapttable/core";
