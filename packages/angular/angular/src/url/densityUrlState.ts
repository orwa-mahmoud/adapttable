/**
 * Row density kept in the URL.
 */
import { densitySlice, type TableDensity } from "@adapttable/core";
import { computed, type Signal } from "@angular/core";

import { type MaybeSignalOptional, readMaybe } from "../store";
import { injectUrlSlice, type UrlSliceOptions } from "./urlSlice";

/**
 * Options for {@link injectDensityUrlState}.
 *
 * @public
 */
export interface DensityUrlStateOptions extends UrlSliceOptions {
  /** The density while the URL says nothing. Defaults to comfortable. */
  readonly defaultDensity?: MaybeSignalOptional<TableDensity>;
}

/**
 * Row density in the URL.
 *
 * @public
 */
export interface DensityUrlState {
  /** The current density. */
  readonly density: Signal<TableDensity>;
  /** Write a density. */
  readonly onDensityChange: (density: TableDensity) => void;
}

/**
 * Keep a table's row density in the URL.
 *
 * @param options - See {@link DensityUrlStateOptions}.
 * @returns See {@link DensityUrlState}.
 *
 * @public
 */
export function injectDensityUrlState(
  options: DensityUrlStateOptions = {}
): DensityUrlState {
  const slice = injectUrlSlice(
    options,
    densitySlice,
    computed(() => ({ defaultDensity: readMaybe(options.defaultDensity) }))
  );
  return { density: slice.value, onDensityChange: slice.set };
}
