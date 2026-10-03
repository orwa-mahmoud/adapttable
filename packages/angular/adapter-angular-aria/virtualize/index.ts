/**
 * Row windowing — `@adapttable/angular-aria/virtualize`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  virtualize as coreAngularVirtualize,
  type VirtualizeOptions,
} from "@adapttable/angular";

/**
 * Render only the rows in view. Compose with `paginationMode="infinite"`
 * (or a grouped page): a flat paged table already bounds what is
 * rendered, so the window stays off.
 *
 * @param options - Master switch or the windowing knobs.
 *
 * @public
 */
export function virtualize(
  options: VirtualizeOptions = true
): AdaptTableFeature {
  return coreAngularVirtualize(options);
}
