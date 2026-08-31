/**
 * Headless data-tier hook — includes the filter engine.
 *
 * `<DataTable>` uses {@link useTableDataLean} instead, so a three-prop
 * table never downloads this module.
 */
import { FILTER_ENGINE_IMPL } from "../filters/filterEngine";
import {
  useTableDataWithEngine,
  type UseTableDataOptions,
  type UseTableDataResult,
} from "./useTableDataImpl";

export type {
  DataModeProps,
  UseTableDataOptions,
  UseTableDataResult,
} from "./useTableDataImpl";
export { isDeclarativeFilters } from "./isDeclarativeFilters";

/**
 * Resolve the table's data tier and the declarative-filter runtime.
 *
 * @public
 */
export function useTableData<TRow>(
  options: UseTableDataOptions<TRow>
): UseTableDataResult<TRow> {
  return useTableDataWithEngine(options, FILTER_ENGINE_IMPL);
}
