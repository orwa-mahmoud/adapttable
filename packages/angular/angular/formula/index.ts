/**
 * Spreadsheet formulas — `@adapttable/angular/formula`.
 *
 * A separate entry point, so a table with no computed columns never
 * downloads a parser. Import it and columns can be typed as formulas; do not,
 * and none of this code reaches the bundle.
 *
 * ```ts
 * import { buildFormulaColumns } from "@adapttable/angular/formula";
 *
 * const { columns: computed } = buildFormulaColumns<Row>([
 *   { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
 * ]);
 * ```
 *
 * @packageDocumentation
 */
export {
  type AngularFormulaColumnsResult,
  buildFormulaColumns,
} from "./formulaColumns";
export {
  FORMULA_URL_WRITE_DEBOUNCE_MS,
  type FormulaColumnSpec,
  type FormulaUrlState,
  type FormulaUrlStateOptions,
  injectFormulaUrlState,
} from "./formulaUrlState";
export type {
  CellContext,
  ColumnDef,
  FooterContext,
  HeaderContext,
  MaybeSignalOptional,
  Renderer,
  TableUrlStateOptions,
  UrlSliceOptions,
} from "@adapttable/angular";
