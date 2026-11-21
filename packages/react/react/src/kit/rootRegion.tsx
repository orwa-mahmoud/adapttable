/**
 * The table's root region: the one element every kit frame draws around the
 * table, which features may wrap — a context menu listens on it.
 *
 * The base names the region, not the features. Each fill receives the
 * finished view and the table's props, renders its own chrome, and hands the
 * rest of the walk the attributes it adds to the root. Fills nest in feature
 * order; when two add the same attribute, the later one's value is used.
 */
import { featureSlotKey } from "@adapttable/core/binding";
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
