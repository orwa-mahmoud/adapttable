/**
 * The formula columns' slice of view state. A spec for
 * `createUrlSliceStore`; specs are read and never evaluated here.
 */
import { PARAM_FORMULA } from "../url/serialize";
import { URL_SLICE_WRITE_DEBOUNCE_MS } from "../url/viewStateSlices";
import type { UrlSliceSpec } from "../url/viewStateStore";
import type { FormulaColumnSpec } from "./formulaColumn";
import {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "./formulaUrlCodec";

/** Stable identity for "no formula columns", so a read cannot churn a memo. */
const NO_FORMULAS: readonly FormulaColumnSpec[] = [];

/**
 * Formula columns. Absent means nothing has been said, so the default
 * applies; present and empty means someone removed the last column. Specs
 * are read and never evaluated here.
 *
 * @public
 */
export const formulaSlice: UrlSliceSpec<
  readonly FormulaColumnSpec[],
  { readonly defaultFormulas?: readonly FormulaColumnSpec[] }
> = {
  read(params, ns, { defaultFormulas }) {
    const raw = params.get(`${ns}${PARAM_FORMULA}`);
    if (raw === null) return defaultFormulas ?? NO_FORMULAS;
    return deserializeFormulaColumns(raw);
  },
  write(params, value, ns, { defaultFormulas }) {
    const encoded = serializeFormulaColumns(value);
    if (encoded !== "") params.set(`${ns}${PARAM_FORMULA}`, encoded);
    else if (defaultFormulas && defaultFormulas.length > 0) {
      // An emptied list writes the empty marker when there is a default to
      // displace: deleting the parameter reads back as "nothing has been
      // said", and removed columns would return on the next read.
      params.set(`${ns}${PARAM_FORMULA}`, "");
    } else params.delete(`${ns}${PARAM_FORMULA}`);
  },
  writeDebounceMs: URL_SLICE_WRITE_DEBOUNCE_MS,
};
