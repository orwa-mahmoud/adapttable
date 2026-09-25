import { createElement } from "react";

import {
  grouping as coreGrouping,
  type GroupingExtras,
  type StaticGroupingExtras,
} from "../features/grouping";
import { extendFeature, slotRender } from "../features/providers";
import {
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
} from "../features/slotKeys";
import type {
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

/**
 * Kit renderers for grouped desktop rows and mobile cards.
 *
 * @public
 */
export interface AdapterGroupingComponents {
  /** Desktop group header, footer and show-more row. */
  readonly GroupHeaderRow: AdapterFeatureComponent<
    GroupHeaderRowSlotProps<never>
  >;
  /** Mobile group header, footer and show-more card. */
  readonly GroupHeaderCard: AdapterFeatureComponent<
    GroupHeaderCardSlotProps<never>
  >;
}

/**
 * The overloaded grouping factory after a kit supplies its chrome.
 *
 * @public
 */
export interface AdapterGroupingFeature {
  /** Group without row-aware extras. */
  (
    groupBy: string | readonly string[],
    extras?: StaticGroupingExtras
  ): StaticTableFeature;
  /** Group with row-aware aggregate, footer or filtering extras. */
  <TRow>(
    groupBy: string | readonly string[],
    extras: GroupingExtras<TRow>
  ): TableFeature<TRow>;
}

/**
 * Bind core's grouping model to one kit's row and card renderers.
 *
 * @public
 */
export function createAdapterGroupingFeature(
  components: AdapterGroupingComponents
): AdapterGroupingFeature {
  const renders = [
    slotRender(GROUP_HEADER_ROW, (props) =>
      createElement(components.GroupHeaderRow, props)
    ),
    slotRender(GROUP_HEADER_CARD, (props) =>
      createElement(components.GroupHeaderCard, props)
    ),
  ];

  function grouping(
    groupBy: string | readonly string[],
    extras?: StaticGroupingExtras
  ): StaticTableFeature;
  function grouping<TRow>(
    groupBy: string | readonly string[],
    extras: GroupingExtras<TRow>
  ): TableFeature<TRow>;
  function grouping<TRow>(
    groupBy: string | readonly string[],
    extras: GroupingExtras<TRow> = {}
  ): TableFeature<TRow> {
    return extendFeature(coreGrouping<TRow>(groupBy, extras), renders);
  }

  return grouping;
}
