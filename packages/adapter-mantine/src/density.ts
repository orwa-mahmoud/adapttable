import type { MantineSpacing } from "@mantine/core";

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
