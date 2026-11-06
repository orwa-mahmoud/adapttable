/**
 * The table engine — `@adapttable/core/engine`.
 *
 * The constructors a host uses to create a table, and the types those
 * constructors return. Formula, pivot, the export writers and the editing
 * session stay on their own entries. Every name here is also exported from
 * `@adapttable/core`, from the same source module.
 *
 * @packageDocumentation
 */
export { createBasicTableEngine } from "./engine/basicTableEngine";
export {
  cellSortValue,
  cellValue,
  resolveColumnPath,
} from "./engine/cellValue";
export {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableCallbackRefresh,
  type TableEngine,
  type TableEngineConfigPatch,
  type TableEngineReader,
  type TableOperation,
  type TableRevisionAxis,
  type TableRevisions,
  type TableRowScope,
  type TableSnapshot,
} from "./engine/createTableEngine";
export {
  createNeutralTable,
  type NeutralTable,
  type NeutralTableBinding,
  revisionToken,
} from "./engine/neutralTable";
export { engineSearchText } from "./engine/searchText";

/**
 * Member types the signatures above hand back. Already public on
 * `@adapttable/core`; this entry names them so a consumer of `/engine` can
 * name the parts of what it returns. The incremental cache functions stay
 * off this door.
 */
export type { Command } from "./actions/commandRegistry";
export type {
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export type {
  Aggregatable,
  AggregatableConfig,
  AggregateOperation,
  CustomAggregateOperation,
  ResolvedAggregateOperation,
} from "./aggregate/aggregatable";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOptions,
  AggregateOrderedValue,
  AggregateSpec,
  Aggregator,
} from "./aggregate/aggregate";
export type { DeclaredAggregates } from "./aggregate/aggregate";
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
  ExtraFilters,
  FilterValue,
  SortableValue,
  SortDirection,
} from "./columnModel";
export type {
  ColumnLayoutState,
  PinOffset,
  PinSide,
  UseColumnLayoutResult,
} from "./columns/columnLayoutModel";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
  PinnedSide,
} from "./columns/columnMenuModel";
export type { DisplayValue } from "./display";
export type {
  CustomCellEditorConflict,
  CustomCellEditorCtrl,
  CustomCellEditorRender,
} from "./editing/cellEditing";
export type {
  ExportPayload,
  ExportRowMeta,
  ExportRowRole,
  ExportTable,
  ExportWriteContext,
  ExportWriter,
} from "./export/exportWriter";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FeatureHostState,
  FilterTypeExtend,
  SidePanelEntry,
} from "./features/currentHost";
export type { ChecklistValue } from "./filters/checklistValues";
export type { FacetCounts, FacetMap } from "./filters/facets";
export {
  type ChipLabelResolver,
  FILTER_TYPES,
  type FilterAiOptions,
  type FilterDef,
  type FilterOption,
  type FilterOptionsSource,
  type FilterType,
} from "./filters/filterDefs";
export type { FilterFormSource } from "./filters/filterFormModel";
export type {
  FilterTypeSpec,
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
} from "./grouping/groupAggregateOverrides";
export type {
  GroupingChipKeyboardProps,
  GroupingDragProps,
  GroupingDragSource,
  GroupingDragState,
  GroupingDropProps,
  GroupingPanelInteractions,
  GroupingPanelState,
} from "./grouping/groupingPanelModel";
export type { GroupAggregateOps } from "./grouping/groupRowLayout";
export type {
  GroupAggregatesFn,
  GroupNode,
  GroupPaging,
  GroupSort,
} from "./grouping/groupRows";
export type { IncrementalViewConfig } from "./rows/incremental";
export type { SortLevel } from "./sort/compare";
export type {
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "./source/capabilities";
export type {
  AggregateFn,
  QueryAggregate,
  QueryCondition,
  QueryFilterGroup,
} from "./source/queryContract";
export type { QueryGroupRow } from "./source/queryGroups";
export type { TableSource } from "./source/TableSource";
export type { TableStateMutators } from "./tableStateMutators";
export type { ResolvedPaginationMode, TableLabels } from "./types";
