/**
 * Spreadsheet formulas — `@adapttable/core/formula`.
 *
 * A separate entry point, so a table with no computed columns never
 * downloads a parser. Import it and columns can be typed as formulas; do not,
 * and none of this code reaches the bundle.
 *
 * ```tsx
 * import { buildFormulaColumns } from "@adapttable/core/formula";
 *
 * const { columns: computed } = buildFormulaColumns<Row>([
 *   { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
 * ]);
 * ```
 */
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
} from "./formula/evaluate";
export {
  buildFormulaColumns,
  type FormulaColumnSpec,
  type FormulaColumnsResult,
} from "./formula/formulaColumn";
export {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "./formula/formulaUrlCodec";
export {
  type BinaryOp,
  type FormulaNode,
  formulaRefs,
  parseFormula,
  type ParseResult,
} from "./formula/parse";
export {
  FORMULA_URL_WRITE_DEBOUNCE_MS,
  useFormulaUrlState,
  type UseFormulaUrlStateOptions,
  type UseFormulaUrlStateResult,
} from "./formula/useFormulaUrlState";
export type { ColumnDef, SortableValue } from "./types";
export type { UrlStateAdapter } from "./url/adapter";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditor } from "./editing/cellEditing";
export type { ColumnFilter } from "./filters/filterDefs";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
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
export type { FilterOptionsSource } from "./filters/filterDefs";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FilterOption } from "./filters/filterDefs";
