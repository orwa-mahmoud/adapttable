import { densitySlice, type TableDensity } from "@adapttable/core";
import { type MaybeRefOrGetter, toValue } from "vue";

import type { MaybeRefOrGetterOptional } from "../store";
import { type UrlSliceOptions, useUrlSlice } from "./useUrlSlice";

export type Density = TableDensity;
export { URL_SLICE_WRITE_DEBOUNCE_MS as DENSITY_URL_WRITE_DEBOUNCE_MS } from "@adapttable/core";
export interface UseDensityUrlStateOptions extends UrlSliceOptions {
  readonly defaultDensity?: MaybeRefOrGetterOptional<TableDensity>;
}
export function useDensityUrlState(
  input: MaybeRefOrGetter<UseDensityUrlStateOptions> = {},
  activity?: MaybeRefOrGetter<boolean>
) {
  const slice = useUrlSlice(
    input,
    densitySlice,
    () => ({ defaultDensity: toValue(toValue(input).defaultDensity) }),
    activity
  );
  return {
    density: slice.value,
    onDensityChange: slice.set,
    flush: slice.flush,
  };
}
export type UseDensityUrlStateResult = ReturnType<typeof useDensityUrlState>;
