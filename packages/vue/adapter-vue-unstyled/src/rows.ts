/** Optional host-owned row composition and actions, over the shared binding. */
export type {
  CellSpanAppearance,
  CellSpanRequest,
  ConfirmHandler,
  ConfirmRequest,
  ExtraRowKind,
  GetCellSpan,
  GetCellSpanArgs,
  PinnedRows,
  PinnedSummaryEntry,
  RowAction,
  RowHeight,
  RowMutationHandlers,
  RowPinSide,
  RowPinState,
  RowStyle,
} from "@adapttable/vue";
export type { ExtraEntry, ExtraRow } from "@adapttable/vue/adapter";
export type {
  RowAppearanceOptions,
  RowPinningFeatureOptions,
} from "@adapttable/vue/features";
export {
  cellSpan,
  extraRows,
  pinnedSummaryRows,
  rowActions,
  rowAppearance,
  rowPinning,
} from "@adapttable/vue/features";
