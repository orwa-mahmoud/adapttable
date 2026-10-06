/**
 * Custom filter types for Angular.
 *
 * The specs register on the feature host, and the filter runtime merges them
 * into the types the panel can render.
 */
import type { AdaptTableFeature } from "@adapttable/angular";
import type { FilterTypeSpec } from "@adapttable/core";
import { coreFilterTypes } from "@adapttable/core/binding";

/**
 * Register custom filter types the panel can render.
 *
 * @param specs - The types, each with its own field.
 * @returns The feature.
 *
 * @public
 */
export function filterTypes(
  specs: readonly FilterTypeSpec[]
): AdaptTableFeature {
  return coreFilterTypes(specs);
}
