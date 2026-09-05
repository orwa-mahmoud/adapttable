import type { DisplayValue } from "../display";

import type { FilterDef } from "../filters/filterDefs";

/**
 * True when the `filters` prop is the declarative array form.
 *
 * @public
 */
export function isDeclarativeFilters<TRow>(
  filters: readonly FilterDef<TRow>[] | DisplayValue
): filters is readonly FilterDef<TRow>[] {
  return Array.isArray(filters);
}
