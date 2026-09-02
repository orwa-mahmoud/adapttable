import { createElement } from "react";

import type {
  GroupingExtras,
  StaticGroupingExtras,
} from "../features/grouping";
import { groupingPanel as coreGroupingPanel } from "../features/grouping-panel";
import { extendFeature, slotRender } from "../features/providers";
import {
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  GROUPING_PANEL,
} from "../features/slotKeys";
import type {
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { GroupingPanelSlotProps } from "../grouping/GroupingPanelChrome";
import type { AdapterFeatureComponent } from "./component";

/** Kit renderers needed by the interactive grouping feature. @public */
export interface AdapterGroupingPanelComponents {
  /** Desktop grouped-row renderer. */
  GroupHeaderRow: AdapterFeatureComponent<GroupHeaderRowSlotProps<never>>;
  /** Mobile grouped-card renderer. */
  GroupHeaderCard: AdapterFeatureComponent<GroupHeaderCardSlotProps<never>>;
  /** Interactive grouping strip renderer. */
  GroupingPanel: AdapterFeatureComponent<GroupingPanelSlotProps<never>>;
}

/**
 * The overloaded interactive grouping factory after a kit supplies chrome.
 *
 * @public
 */
export interface AdapterGroupingPanelFeature {
  /** Create a panel with static grouping options. */
  (
    groupBy?: string | readonly string[],
    extras?: StaticGroupingExtras
  ): StaticTableFeature;
  /** Create a panel with row-aware aggregate, footer, or filtering options. */
  <TRow>(
    groupBy: string | readonly string[] | undefined,
    extras: GroupingExtras<TRow>
  ): TableFeature<TRow>;
}

/** Bind core's grouping panel and group headers to one UI kit. @public */
export function createAdapterGroupingPanelFeature(
  components: AdapterGroupingPanelComponents
): AdapterGroupingPanelFeature {
  const renders = [
    slotRender(GROUP_HEADER_ROW, (props) =>
      createElement(components.GroupHeaderRow, props)
    ),
    slotRender(GROUP_HEADER_CARD, (props) =>
      createElement(components.GroupHeaderCard, props)
    ),
    slotRender(GROUPING_PANEL, (props) =>
      createElement(components.GroupingPanel, props)
    ),
  ];

  function groupingPanel(
    groupBy?: string | readonly string[],
    extras?: StaticGroupingExtras
  ): StaticTableFeature;
  function groupingPanel<TRow>(
    groupBy: string | readonly string[] | undefined,
    extras: GroupingExtras<TRow>
  ): TableFeature<TRow>;
  function groupingPanel<TRow>(
    groupBy?: string | readonly string[],
    extras: GroupingExtras<TRow> = {}
  ): TableFeature<TRow> {
    return extendFeature(coreGroupingPanel(groupBy, extras), renders);
  }

  return groupingPanel;
}
