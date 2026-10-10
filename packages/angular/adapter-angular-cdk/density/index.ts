/**
 * Density chooser — `@adapttable/angular-cdk/density`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  coreDensityChooser,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular/adapter";
import { AdaptDensityButton } from "@adapttable/angular-cdk";

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
