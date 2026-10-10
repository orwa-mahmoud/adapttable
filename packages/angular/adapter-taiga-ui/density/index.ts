import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  coreDensityChooser,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular/adapter";
import { AdaptDensityButton } from "@adapttable/taiga-ui";

/**
 * Density chooser — `@adapttable/taiga-ui/density`.
 *
 * @packageDocumentation
 */

/**
 * A toolbar button that switches between comfortable and compact rows. The
 * choice is kept in the URL.
 *
 * @public
 */
export function densityChooser(): AdaptTableFeature {
  return extendFeature(coreDensityChooser(), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptDensityButton, {
      orderAs: "density-chooser",
    }),
  ]);
}
