/**
 * Find-as-you-type over the rendered rows — `@adapttable/angular-material/find-in-table`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  FIND_BAR,
  findInTable as bindingFindInTable,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular";

import { AdaptFindBar, AdaptFindToolbarButton } from "./findBar";

export { AdaptFindBar, AdaptFindToolbarButton };

/**
 * Find-as-you-type over the rendered rows, with a native input and buttons.
 *
 * `button: true` also draws a Find control among the toolbar's view controls.
 *
 * @param options - `button` draws the toolbar control. Off by default.
 * @returns The feature.
 *
 * @public
 */
export function findInTable(
  options: { readonly button?: boolean } = {}
): AdaptTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, () => AdaptFindBar),
    ...(options.button === true
      ? [
          slotRender(TOOLBAR_EXTRAS, () => AdaptFindToolbarButton, {
            orderAs: "find",
          }),
        ]
      : []),
  ]);
}
