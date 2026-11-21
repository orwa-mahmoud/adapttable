/**
 * Row grouping — `@adapttable/core/grouping`.
 *
 * The pure grouping projection and the panel model the bindings already
 * share. Every name here is also exported from `@adapttable/core`, from the
 * same source module. The incremental cache stays on the root.
 *
 * @packageDocumentation
 */
export type {
  ExportScopeCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "./contracts/source";
export {
  type GroupAggregateOverride,
  type GroupAggregateOverrides,
  parseGroupAggregateOverrides,
  queryAggregateOps,
  serializeGroupAggregateOverrides,
  withGroupAggregateOverrides,
  withQueryAggregateOverrides,
} from "./grouping/groupAggregateOverrides";
export type {
  GroupingChipKeyboardProps,
  GroupingDragEventLike,
  GroupingDragProps,
  GroupingDragSource,
  GroupingDragState,
  GroupingDropProps,
  GroupingKeyEventLike,
  GroupingPanelInteractions,
  GroupingPanelState,
} from "./grouping/groupingPanelModel";
export type {
  GroupingPanelSource,
  GroupingPanelStateInput,
} from "./grouping/groupingPanelState";
export {
  formatGroupBy,
  type GroupByInput,
  parseGroupBy,
} from "./grouping/groupKeys";
export {
  groupAggregateEntries,
  groupAggregateNode,
  type GroupAggregateOps,
  groupLeafCount,
  type GroupRowCell,
  type GroupRowLayout,
  groupRowLayout,
} from "./grouping/groupRowLayout";
export {
  buildGroupedFlatModel,
  type BuildGroupedFlatModelOptions,
  formatGroupLabel,
  type GroupAggregatesFn,
  type GroupedFlatEntry,
  type GroupNode,
  type GroupPaging,
  type GroupSort,
  groupValueKey,
  type RowGroupLevel,
  type RowGroupRef,
} from "./grouping/groupRows";
export { groupSelectionState } from "./grouping/groupSelection";
export type { QueryGroupRow } from "./source/queryGroups";

/**
 * Member types the signatures above hand back. Already public on
 * `@adapttable/core`.
 */
export type {
  Aggregatable,
  AggregatableConfig,
  AggregateOperation,
  AggregationSourceSupport,
  CustomAggregateOperation,
  ResolvedAggregateOperation,
} from "./aggregate/aggregatable";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOrderedValue,
  Aggregator,
  DeclaredAggregates,
} from "./aggregate/aggregate";
export type {
  AggregationCandidate,
  AggregationItem,
  AggregationModel,
  AggregationOrigin,
} from "./aggregate/aggregationModel";
export type {
  ColumnAiOptions,
  ColumnGroupShow,
  ColumnMetadata,
  ColumnModel,
  ColumnModelEditor,
  ColumnModelFilter,
  RowCallback,
  SortableValue,
} from "./columnModel";
export type { DisplayValue } from "./display";
export type { ExtraEntry, ExtraRow, ExtraRowKind } from "./rows/extraRows";
export type { HeaderSelectionState } from "./selection/selectionState";
export type { GroupingCapability } from "./source/capabilities";
export type { AggregateFn, QueryAggregate } from "./source/queryContract";
