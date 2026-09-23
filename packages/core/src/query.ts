/**
 * The query model, without React — `@adapttable/core/query`.
 *
 * Everything the table puts in a URL has to be read back somewhere, and that
 * somewhere is not always a browser. A shared link arrives at a Next.js route
 * handler, a Remix loader, an Express endpoint — processes that have no DOM,
 * often no React, and no business loading a table engine to decode a query
 * string.
 *
 * So the parts of the model that are pure — the AND/OR filter-tree encoding,
 * the pivot encoding, the formula-column encoding, and the types that describe
 * them — are exported here as well, from an entry that imports nothing. No
 * hooks, no components, no `"use client"` boundary: this file is the one place
 * in the package a backend can import and stay a backend.
 *
 * Every name here is also exported from `@adapttable/core`,
 * `@adapttable/core/pivot` or `@adapttable/core/formula`, from the same source
 * module. This entry is a narrower door onto the same room, not a second copy
 * of it — the encoding a server reads is byte-for-byte the encoding the table
 * wrote.
 *
 * Reading a formula column here yields its TEXT. Nothing in this entry parses
 * or evaluates one, which is what makes it safe to decode a link somebody else
 * sent.
 *
 * ```ts
 * import { parseFilterTree, isFilterGroup } from "@adapttable/core/query";
 *
 * const tree = parseFilterTree(new URL(request.url).searchParams.get("ft"));
 * ```
 *
 * For a parser that also validates against an allowlist of columns, use
 * `@adapttable/server` — it is built on this entry.
 *
 * @packageDocumentation
 */

export type {
  AggregateName,
  AggregateOrderedValue,
  Aggregator,
} from "./aggregate/aggregate";
export {
  FILTER_TYPES,
  type FilterDef,
  type FilterOption,
  type FilterOptionsSource,
  type FilterType,
  RANGE_SUFFIXES,
} from "./filters/filterDefs";
export type { FilterTypeSpec } from "./filters/filterRegistry";
export {
  FILTER_TREE_PARAM,
  FILTER_TREE_VERSION,
  isActiveFilterTree,
  parseFilterTree,
  serializeFilterTree,
} from "./filters/filterTreeCodec";
export {
  DATE_OPS,
  FILTER_OP_SUFFIX,
  NUMBER_OPS,
  TEXT_OPS,
} from "./filters/operators";
export { parseRelativeToken } from "./filters/relativeDates";
export type { FormulaValue } from "./formula/evaluate";
export type { FormulaColumnSpec } from "./formula/formulaColumn";
export {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "./formula/formulaUrlCodec";
export type { PivotConfig, PivotMeasure } from "./pivot/pivotModel";
export {
  deserializePivot,
  deserializePivotState,
  type PivotUrlState,
  serializePivot,
  serializePivotState,
} from "./pivot/pivotUrlCodec";
export type { SortLevel } from "./sort/compare";
export {
  isFilterGroup,
  type QueryCondition,
  type QueryFilterGroup,
} from "./source/queryContract";
export type { SortDirection } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnModel` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
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
  AggregateOperationId,
  AggregateOptions,
  AggregateSpec,
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
  FilterValue,
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
  TableEngine,
  TableEngineConfigPatch,
  TableEngineReader,
  TableOperation,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
  TableSnapshot,
} from "./engine/createTableEngine";
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
export type { ChipLabelResolver, FilterAiOptions } from "./filters/filterDefs";
export type { FilterFormSource } from "./filters/filterFormModel";
export type {
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export {
  RELATIVE_NAMED,
  type RelativeDateToken,
} from "./filters/relativeDates";
export type { FormulaErrorCode } from "./formula/evaluate";
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
export type {
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "./source/capabilities";
export type { AggregateFn, QueryAggregate } from "./source/queryContract";
export type { QueryGroupRow } from "./source/queryGroups";
export type { TableSource } from "./source/TableSource";
export type { TableStateMutators } from "./tableStateMutators";
export type {
  ExtraFilters,
  ResolvedPaginationMode,
  SortableValue,
  TableLabels,
} from "./types";
