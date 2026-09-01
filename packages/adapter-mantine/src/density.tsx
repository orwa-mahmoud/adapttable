import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import { densityChooser as core } from "@adapttable/core/features";
import type { MantineSpacing } from "@mantine/core";

import { DensityButton } from "./components/toolbarExtras";

/**
 * Switch row density, with Mantine's own toolbar control.
 *
 * @public
 */
export function densityChooser(): StaticTableFeature {
  return extendFeature(core(), [
    slotRender(TOOLBAR_EXTRAS, (props) => <DensityButton {...props} />),
  ]);
}

/** Row density — independent of column pinning. */
export type Density = "comfortable" | "compact";

/** Mantine `<Table>` spacing props for a given density. */
export interface DensitySpacing {
  /** Cell padding along the block axis for this density. */
  verticalSpacing: MantineSpacing;
  /** Cell padding along the inline axis for this density. */
  horizontalSpacing: MantineSpacing;
}

/**
 * Maps each {@link Density} to the Mantine `<Table>` spacing props.
 * `comfortable` keeps the original `sm`/`md` rhythm; `compact` tightens
 * rows with a 4px vertical gap and `sm` horizontal padding.
 */
export const DENSITY_SPACING: Record<Density, DensitySpacing> = {
  comfortable: { verticalSpacing: "sm", horizontalSpacing: "md" },
  compact: { verticalSpacing: 4, horizontalSpacing: "sm" },
};
