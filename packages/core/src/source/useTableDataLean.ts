/**
 * Data-tier hook for `<DataTable>`: search / sort / page, no filter engine
 * unless `filters()` published one.
 */
import { FILTER_ENGINE } from "../features/filterEngineKey";
import { useFeatureState } from "../features/providers";
import {
  useTableDataWithEngine,
  type UseTableDataOptions,
  type UseTableDataResult,
} from "./useTableDataImpl";

/**
 * Same contract as {@link useTableData}, without a static filter-engine import.
 *
 * @public
 */
export function useTableDataLean<TRow>(
  options: UseTableDataOptions<TRow>
): UseTableDataResult<TRow> {
  return useTableDataWithEngine(options, useFeatureState(FILTER_ENGINE));
}
