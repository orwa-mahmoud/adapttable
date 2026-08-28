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
