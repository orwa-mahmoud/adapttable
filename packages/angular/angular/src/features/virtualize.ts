/**
 * Virtualize feature factory for Angular.
 */
import { coreVirtualize, type VirtualizeInput } from "@adapttable/core/binding";

import type { AdaptTableFeature } from "../featureHost";

/**
 * Options the factory accepts — a boolean or the windowing knobs.
 *
 * @public
 */
export type VirtualizeOptions = VirtualizeInput;

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
  return coreVirtualize(options);
}
