/**
 * Spreadsheet formulas — `@adapttable/core/formula`.
 *
 * A separate entry point, so a table with no computed columns never
 * downloads a parser. Import it and columns can be typed as formulas; do not,
 * and none of this code reaches the bundle.
 *
 * ```tsx
 * import { buildFormulaColumns } from "@adapttable/react/formula";
 *
 * const { columns: computed } = buildFormulaColumns<Row>([
 *   { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
 * ]);
 * ```
 */
export type { ColumnDef } from "./columnDef";
export {
  buildFormulaColumns,
  type ReactFormulaColumnsResult,
} from "./formula/formulaColumns";
export {
  FORMULA_URL_WRITE_DEBOUNCE_MS,
  useFormulaUrlState,
  type UseFormulaUrlStateOptions,
  type UseFormulaUrlStateResult,
} from "./formula/useFormulaUrlState";
export type { UrlStateAdapter } from "./url/adapter";
export type { SortableValue } from "@adapttable/core";
export {
  evaluateFormula,
  FORMULA_BLANK,
  FORMULA_ERRORS,
  FORMULA_FUNCTIONS,
  formulaBoolean,
  formulaDisplay,
  formulaError,
  type FormulaErrorCode,
  formulaNumber,
  type FormulaScope,
  formulaSortValue,
  formulaText,
  type FormulaValue,
  isFormulaError,
  toFormulaValue,
} from "@adapttable/core";
export { type FormulaColumnSpec } from "@adapttable/core";
export {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "@adapttable/core";
export {
  type BinaryOp,
  type FormulaNode,
  formulaRefs,
  parseFormula,
  type ParseResult,
} from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditor } from "@adapttable/core";
export type { ColumnFilter } from "@adapttable/core";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
} from "@adapttable/core";

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
} from "@adapttable/core";
export type { FilterDef, FilterType } from "@adapttable/core";
export type { ColumnHeaderController } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CustomCellEditorCtrl } from "@adapttable/core";
export type { FilterOptionsSource } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FilterOption } from "@adapttable/core";
