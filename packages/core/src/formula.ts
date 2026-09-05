/**
 * Spreadsheet formulas — `@adapttable/core/formula`.
 *
 * A separate entry point, so a table with no computed columns never
 * downloads a parser. Hooks that sync formula columns to the URL live on
 * `@adapttable/react/formula`.
 *
 * @packageDocumentation
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
