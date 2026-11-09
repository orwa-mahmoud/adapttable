import {
  type AdaptTableFeature,
  FEATURE_IMPLEMENTATIONS,
  type GroupingImplementation,
  injectGroupCollapse,
  injectGroupPaging,
  SURFACE_GROUPING,
  SURFACE_HANDLES,
  SURFACE_OCCUPIED,
  withFeatureImplementation,
} from "@adapttable/angular";
import {
  groupingIgnoredWarning,
  groupingProjectionBundle,
  groupingSourceOf,
  projectedGroupingSource,
  projectGrouping,
} from "@adapttable/core";
import { coreGrouping } from "@adapttable/core/binding";
import { createTableEngine } from "@adapttable/core/engine";

import { withFrontendRowModel } from "../source/rowModel";
import { type GroupingExtras } from "./groupingExtras";

export type { GroupingExtras } from "./groupingExtras";

/**
 * The grouped model's code, filed by {@link grouping} and by
 * `groupingPanel()`, which groups too.
 */
export const GROUPING_IMPLEMENTATION: GroupingImplementation = {
  collapse: injectGroupCollapse,
  paging: injectGroupPaging,
  sourceOf: groupingSourceOf,
  ignoredWarning: groupingIgnoredWarning,
  project: projectGrouping,
  bundle: groupingProjectionBundle,
};

/**
 * Group rows under collapsible headers.
 *
 * ```ts
 * import { grouping } from "@adapttable/angular-unstyled/grouping";
 *
 * features: [grouping("team", { groupAggregates: (rows) => ({ points: sum(rows) }) })]
 * ```
 *
 * @param groupBy - The grouping keys, outermost first.
 * @param extras - See {@link GroupingExtras}.
 * @returns The feature.
 *
 * @public
 */
export function grouping<TRow = unknown>(
  groupBy: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): AdaptTableFeature {
  return {
    ...withFeatureImplementation(
      withFrontendRowModel(
        coreGrouping<TRow>(groupBy, extras) as AdaptTableFeature,
        createTableEngine
      ),
      FEATURE_IMPLEMENTATIONS.grouping,
      GROUPING_IMPLEMENTATION
    ),
    mount(context) {
      const occupied = context.state.get(SURFACE_OCCUPIED)();
      if (occupied?.grouping) return;
      const handles = context.injector.get(SURFACE_HANDLES, null);
      if (!handles) return;
      handles.installProjector((source, model) =>
        projectedGroupingSource(source, { model })
      );
      const grouping = handles.createGrouping(context.injector);
      if (grouping === undefined) return;
      handles.publishGrouping(grouping);
      context.state.set(SURFACE_GROUPING, grouping);
      return () => {
        handles.publishGrouping(undefined);
        context.state.set(SURFACE_GROUPING, undefined);
      };
    },
  };
}
