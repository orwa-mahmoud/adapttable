/**
 * The formula columns in the URL, so a typed column survives a reload and can
 * be sent to someone.
 *
 * Everything else a table holds is a choice among things the table offered. A
 * formula is text somebody wrote, which makes it both the most expensive state
 * to rebuild by hand and the most worth putting in a link — and, once it is in
 * a link, the state that must never be executed on the way back in. The
 * encoding reads specs and nothing else; evaluation happens later, in the
 * engine, on purpose.
 */
import {
  injectUrlSlice,
  type MaybeSignalOptional,
  readMaybe,
  type UrlSliceOptions,
} from "@adapttable/angular";
import { type FormulaColumnSpec, formulaSlice } from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

export type { FormulaColumnSpec } from "@adapttable/core";
export { URL_SLICE_WRITE_DEBOUNCE_MS as FORMULA_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";

/**
 * What {@link injectFormulaUrlState} needs.
 *
 * @public
 */
export interface FormulaUrlStateOptions extends UrlSliceOptions {
  /** The columns applied while the URL carries none. Defaults to none. */
  readonly defaultFormulas?: MaybeSignalOptional<readonly FormulaColumnSpec[]>;
}

/**
 * Formula columns in the URL.
 *
 * @public
 */
export interface FormulaUrlState {
  /** The current columns. */
  readonly formulas: Signal<readonly FormulaColumnSpec[]>;
  /** Persist a new list. */
  readonly onFormulasChange: (next: readonly FormulaColumnSpec[]) => void;
}

/**
 * Keep the formula columns in the URL.
 *
 * @param options - See {@link FormulaUrlStateOptions}.
 * @returns See {@link FormulaUrlState}.
 *
 * @public
 */
export function injectFormulaUrlState(
  options: FormulaUrlStateOptions = {}
): FormulaUrlState {
  const slice = injectUrlSlice(
    options,
    formulaSlice,
    computed(() => ({
      defaultFormulas: readMaybe(options.defaultFormulas),
    }))
  );
  return { formulas: slice.value, onFormulasChange: slice.set };
}
