/**
 * Built-in filter types. Kept off `filterDefs` so a table that only
 * imports `filterLabel` / `useFrontendData` does not pay for every
 * predicate, chip and operator.
 */
import { createBuiltInFilterSpecs } from "./filterDefs";
import {
  createFilterRegistry,
  type FilterTypeRegistry,
  type FilterTypeSpec,
  withFilterType,
} from "./filterRegistry";

/**
 * Built-in types — the registry's first consumers.
 *
 * @internal
 */
export const builtInFilterSpecs: readonly FilterTypeSpec[] =
  // PURE: a table that never imports the registry must not evaluate this.
  /*#__PURE__*/ createBuiltInFilterSpecs();

/**
 * Default registry: every built-in type, nothing else.
 *
 * It builds its own specs rather than reading {@link builtInFilterSpecs}.
 * Both are pure so a plain table shakes them out, and a pure binding is free
 * to land in a different chunk from the one that reads it — which happened
 * the moment a new entry point changed the chunk layout, and handed this an
 * empty spec list. With no cross-binding there is no order to get wrong.
 *
 * @internal
 */
export const defaultFilterRegistry: FilterTypeRegistry =
  /*#__PURE__*/ createFilterRegistry(/*#__PURE__*/ createBuiltInFilterSpecs());

/**
 * Merge host `filterTypes` onto the built-ins (same `type` replaces).
 *
 * @internal
 */
export function resolveFilterRegistry(
  extras?: readonly FilterTypeSpec[]
): FilterTypeRegistry {
  if (!extras || extras.length === 0) return defaultFilterRegistry;
  return extras.reduce(
    (registry, spec) => withFilterType(registry, spec),
    defaultFilterRegistry
  );
}
