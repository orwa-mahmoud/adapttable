/**
 * The table's root region: the one element every kit frame draws around the
 * table, which features may wrap — a context menu listens on it.
 *
 * The base names the region, not the features. Each fill receives the
 * finished view and the table's props, renders its own chrome, and hands the
 * rest of the walk the attributes it adds to the root. Fills nest in feature
 * order; when two add the same attribute, the later one's value is used.
 */
import { featureSlotKey, rowSlotKey } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { useSlotFills } from "../features/providers";
import type { DataTableShellResult } from "../useDataTableShell";
import type { KitTableProps } from "./tableComposition";

/**
 * What a root-region fill is rendered with.
 *
 * @public
 */
export interface RootRegionProps<TRow> {
  /** The finished view. */
  readonly view: DataTableShellResult<TRow>;
  /** The table's props. */
  readonly props: KitTableProps<TRow>;
  /** Renders the rest of the region with the attributes this fill adds. */
  readonly children: (regionProps: Record<string, unknown>) => ReactNode;
}

/**
 * The slot a feature fills to wrap the table's root.
 *
 * @public
 */
export const TABLE_ROOT_REGION =
  featureSlotKey<RootRegionProps<unknown>>("table-root-region");

/**
 * What a toolbar position's fill is rendered with: the finished view and the
 * table's props, from which the feature builds its own control's props.
 *
 * @public
 */
export interface KitRegionProps<TRow> {
  /** The finished view. */
  readonly view: DataTableShellResult<TRow>;
  /** The table's props. */
  readonly props: KitTableProps<TRow>;
}

/**
 * How a toolbar position's fill draws, for any row type.
 *
 * @public
 */
export type KitRegionDraw = <TRow>(props: KitRegionProps<TRow>) => ReactNode;

/**
 * The toolbar's saved-views position, filled by the saved-views feature.
 *
 * @public
 */
export const SAVED_VIEWS_REGION = rowSlotKey<KitRegionDraw>(
  "saved-views-region",
  { single: true }
);

/**
 * The toolbar's column-menu position, filled by the column-menu feature.
 *
 * @public
 */
export const COLUMN_MENU_REGION = rowSlotKey<KitRegionDraw>(
  "column-menu-region",
  { single: true }
);

/**
 * The bars under the toolbar. Every composed feature that draws a bar fills
 * it; the bars stack in feature order.
 *
 * @public
 */
export const BARS_AREA = rowSlotKey<KitRegionDraw>("table-bars");

/** Nest the composed fills around the root, collecting their attributes. */
export function RootRegion<TRow>({
  view,
  props,
  children,
}: RootRegionProps<TRow>): ReactNode {
  "use no memo";
  const fills = useSlotFills(TABLE_ROOT_REGION);
  const walk = (
    index: number,
    regionProps: Record<string, unknown>
  ): ReactNode => {
    const fill = fills[index];
    if (fill === undefined) return children(regionProps);
    const render = fill.render as (props: RootRegionProps<TRow>) => ReactNode;
    return render({
      view,
      props,
      children: (own) => walk(index + 1, { ...regionProps, ...own }),
    });
  };
  return walk(0, {});
}
