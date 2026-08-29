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
export type { ColumnDef } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
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
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  CellEditorOption,
  CustomCellEditorRender,
} from "./editing/cellEditing";
export type { ExportTable } from "./export/exportWriter";
export type { FilterDef, FilterType } from "./filters/filterDefs";
export type { ColumnHeaderController } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CustomCellEditorCtrl } from "./editing/cellEditing";
export type { ExportRowMeta } from "./export/exportWriter";
export type { FilterOptionsSource } from "./filters/filterDefs";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { ExportRowRole } from "./export/exportWriter";
export type { FilterOption } from "./filters/filterDefs";
