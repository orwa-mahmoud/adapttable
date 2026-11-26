/**
 * Virtualize feature factory for Angular.
 */
import {
  type AdaptTableFeature,
  FEATURE_IMPLEMENTATIONS,
  injectKeyedVirtualization,
  injectTableVirtualizer,
  type VirtualizeImplementation,
  withFeatureImplementation,
} from "@adapttable/angular";
import { coreVirtualize, type VirtualizeInput } from "@adapttable/core/binding";

/**
 * Options the factory accepts — a boolean or the windowing knobs.
 *
 * @public
 */
export type VirtualizeOptions = VirtualizeInput;

/** The windowing code, filed by {@link virtualize}. */
const VIRTUALIZE_IMPLEMENTATION: VirtualizeImplementation = {
  flat: injectTableVirtualizer,
  keyed: injectKeyedVirtualization,
};

/**
 * Render only the rows in view.
 *
 * ```ts
 * import { virtualize } from "@adapttable/angular-unstyled/virtualize";
 *
 * features: [virtualize(), virtualize({ estimateRowSize: 56 })]
 * ```
 *
 * @param options - Master switch or the windowing knobs.
 * @returns The feature.
 *
 * @public
 */
export function virtualize(
  options: VirtualizeOptions = true
): AdaptTableFeature {
  return withFeatureImplementation(
    coreVirtualize(options) as AdaptTableFeature,
    FEATURE_IMPLEMENTATIONS.virtualize,
    VIRTUALIZE_IMPLEMENTATION
  );
}
