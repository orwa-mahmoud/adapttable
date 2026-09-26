/**
 * The formula columns in the URL, so a typed column survives a reload and can
 * be sent to someone.
 *
 * Everything else a table holds is a choice among things the table offered. A
 * formula is text somebody wrote, which makes it both the most expensive state
 * to rebuild by hand and the most worth putting in a link — and, once it is in
 * a link, the state that must never be executed on the way back in. The
 * encoding is in {@link ./formulaUrlCodec}, which reads specs and nothing else;
 * evaluation happens later, in the engine, on purpose.
 */
import { type FormulaColumnSpec, formulaSlice } from "@adapttable/core";

import type { UrlStateAdapter } from "../url/adapter";
import { useUrlSlice } from "../url/useUrlSlice";

export type { UrlStateAdapter };

export { URL_SLICE_WRITE_DEBOUNCE_MS as FORMULA_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";

/**
 * What {@link useFormulaUrlState} needs.
 *
 * @public
 */
export interface UseFormulaUrlStateOptions {
  /** URL-state backend. Defaults to the browser History API. */
  urlAdapter?: UrlStateAdapter;
  /** When `false`, keep the columns in a local memory store. Defaults `true`. */
  urlSync?: boolean;
  /** Namespace, when several tables share one URL (`left.formula`). */
  urlKey?: string;
  /** The columns applied while the URL carries none. Defaults to none. */
  defaultFormulas?: readonly FormulaColumnSpec[];
}

/**
 * The controlled pair to hand a formula bar and {@link buildFormulaColumns}.
 *
 * @public
 */
export interface UseFormulaUrlStateResult {
  /** The columns — from the URL, or the default while the URL is silent. */
  formulas: readonly FormulaColumnSpec[];
  /** Persist a new list. Wire to whatever adds and removes a column. */
  onFormulasChange: (next: readonly FormulaColumnSpec[]) => void;
}

/**
 * Keep the formula columns in the URL.
 *
 * @param options - See {@link UseFormulaUrlStateOptions}.
 * @returns The current columns and a change handler that persists them.
 *
 * @public
 */
export function useFormulaUrlState(
  options: UseFormulaUrlStateOptions = {}
): UseFormulaUrlStateResult {
  const [formulas, onFormulasChange] = useUrlSlice(options, formulaSlice, {
    defaultFormulas: options.defaultFormulas,
  });
  return { formulas, onFormulasChange };
}
