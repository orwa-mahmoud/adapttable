/** Opt-in spreadsheet formulas over the neutral parser and evaluator. */
import {
  buildFormulaColumns as buildNeutralFormulaColumns,
  type FormulaColumnSpec,
  type FormulaColumnsResult,
  formulaSlice,
} from "@adapttable/core";
import { type MaybeRefOrGetter, toValue } from "vue";

import type { ColumnDef } from "./columnDef";
import type { MaybeRefOrGetterOptional } from "./store";
import { type UrlSliceOptions, useUrlSlice } from "./url/useUrlSlice";
export type {
  BinaryOp,
  FormulaColumnSpec,
  FormulaColumnsResult,
  FormulaErrorCode,
  FormulaNode,
  FormulaScope,
  FormulaValue,
  ParseResult,
} from "@adapttable/core/formula";
export {
  deserializeFormulaColumns,
  evaluateFormula,
  FORMULA_BLANK,
  FORMULA_ERRORS,
  FORMULA_FUNCTIONS,
  formulaBoolean,
  formulaDisplay,
  formulaError,
  formulaNumber,
  formulaRefs,
  formulaSortValue,
  formulaText,
  isFormulaError,
  parseFormula,
  serializeFormulaColumns,
  toFormulaValue,
} from "@adapttable/core/formula";
export interface VueFormulaColumnsResult<TRow> extends Omit<
  FormulaColumnsResult<TRow>,
  "columns"
> {
  readonly columns: readonly ColumnDef<TRow>[];
}
export function buildFormulaColumns<TRow extends object>(
  specs: readonly FormulaColumnSpec[]
): VueFormulaColumnsResult<TRow> {
  const result = buildNeutralFormulaColumns<TRow>(specs);
  return {
    ...result,
    columns: result.columns.map((column) => ({
      ...column,
      header: typeof column.header === "string" ? column.header : column.key,
    })),
  };
}
export interface UseFormulaUrlStateOptions extends UrlSliceOptions {
  readonly defaultFormulas?: MaybeRefOrGetterOptional<
    readonly FormulaColumnSpec[]
  >;
}
export function useFormulaUrlState(
  input: MaybeRefOrGetter<UseFormulaUrlStateOptions> = {},
  activity?: MaybeRefOrGetter<boolean>
) {
  const slice = useUrlSlice(
    input,
    formulaSlice,
    () => ({ defaultFormulas: toValue(toValue(input).defaultFormulas) }),
    activity
  );
  return {
    formulas: slice.value,
    onFormulasChange: slice.set,
    flush: slice.flush,
  };
}
export type UseFormulaUrlStateResult = ReturnType<typeof useFormulaUrlState>;
