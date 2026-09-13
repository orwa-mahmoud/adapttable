/**
 * Spreadsheet export — `@adapttable/core/xlsx`.
 *
 * A separate entry point, so a table that exports CSV never downloads a ZIP
 * encoder. Import it and the export button writes `.xlsx` instead; do not, and
 * none of this code reaches the bundle.
 *
 * ```tsx
 * import { xlsxWriter } from "@adapttable/core/xlsx";
 *
 * <DataTable exportCsv={{ writer: xlsxWriter() }} … />
 * ```
 */
export type { ExportViewEntry, ExportWriter } from "./export/exportWriter";
export { buildTableXlsx, xlsxWriter } from "./export/xlsx";
export type { ColumnModel } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnModel` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditor } from "./editing/cellEditing";
export type { ExportPayload, ExportWriteContext } from "./export/exportWriter";
export type { ColumnFilter } from "./filters/filterDefs";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnModel` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  CellEditorOption,
  CustomCellEditorRender,
} from "./editing/cellEditing";
export type { ExportTable } from "./export/exportWriter";
export type {
  FilterAiOptions,
  FilterDef,
  FilterType,
} from "./filters/filterDefs";
export type { ColumnHeaderController } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnModel` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  CustomCellEditorConflict,
  CustomCellEditorCtrl,
} from "./editing/cellEditing";
export type { ExportRowMeta } from "./export/exportWriter";
export type { FilterOptionsSource } from "./filters/filterDefs";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnModel` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { ExportRowRole } from "./export/exportWriter";
export type { FilterOption } from "./filters/filterDefs";

/**
 * Member types the signatures above hand back, reachable from the entry that
 * returns them.
 */
export type {
  Aggregatable,
  AggregatableConfig,
  AggregateOperation,
  CustomAggregateOperation,
} from "./aggregate/aggregatable";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOrderedValue,
  Aggregator,
} from "./aggregate/aggregate";
export type {
  ColumnMetadata,
  ColumnModelEditor,
  ColumnModelFilter,
} from "./columnModel";
export type { ColumnAiOptions } from "./columnModel";
export type { DisplayValue } from "./display";
