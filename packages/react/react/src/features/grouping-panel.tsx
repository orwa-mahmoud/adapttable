/**
 * Interactive row grouping — `@adapttable/<kit>/grouping-panel`.
 *
 * This entry owns its drag state, announcements, and the ordinary grouping
 * engine. Importing plain `grouping()` never reaches this module.
 */
import {
  createGroupingPanelController,
  declaredAggregates,
  groupingPanelAggregations,
} from "@adapttable/core";
import { coreGroupingPanel } from "@adapttable/core/binding";
import { createTableEngine } from "@adapttable/core/engine";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { GROUPING_PANEL_RENDER } from "./areaRegions";
import {
  grouping,
  type GroupingExtras,
  type GroupingPanelStageProps,
  LiveGrouping,
} from "./grouping";
import { GROUPING_PANEL_STATE } from "./groupingPanelKey";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  slotRender,
  useFeatureState,
  useTableRuntime,
} from "./providers";
import { FRONTEND_ROW_MODEL } from "./rowModelKey";
import { type ChromeExtraDraw, GROUPING_LIVE } from "./slotKeys";
import { GROUPING_PANEL_VIEW_STATE } from "./stateKeys";
import type { TableFeature } from "./tableFeature";

interface GroupingPanelFeature<TRow> extends TableFeature<TRow> {
  initialGroupBy?: string | readonly string[];
  /** The extras the panel was composed with, for their declared aggregates. */
  extras?: GroupingExtras<TRow>;
}

/**
 * The panel's React glue: one core controller per provider, fed the live
 * table, and its interactions published to the chrome below.
 */
function GroupingPanelProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const runtime = useTableRuntime();
  const extras: GroupingExtras<unknown> =
    (feature as GroupingPanelFeature<unknown>).extras ?? {};
  const initialGroupBy = (feature as GroupingPanelFeature<unknown>)
    .initialGroupBy;
  const options = { runtime, groupAggregates: extras.groupAggregates };
  const [controller] = useState(() => createGroupingPanelController(options));
  controller.configure(options);
  // The table re-renders when a drag starts or ends. Where it hovers reaches
  // only the strip, through the interactions' live state.
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getTableSnapshot,
    controller.getTableSnapshot
  );
  useEffect(() => {
    controller.initialize(initialGroupBy);
  }, [controller, initialGroupBy]);

  // A link, a saved view or a configuration change can carry an operation a
  // column no longer allows; the controller reconciles whenever its inputs do.
  const reconcileKey = controller.reconcileKey();
  useEffect(() => {
    controller.reconcile();
  }, [controller, reconcileKey]);

  // One interactions object per snapshot and declaration, so the scope below
  // changes exactly when they do.
  const value = controller.interactions(
    snapshot,
    declaredAggregates(extras.groupAggregates)
  );

  return (
    <FeatureStateScope stateKey={FRONTEND_ROW_MODEL} value={createTableEngine}>
      <FeatureStateScope stateKey={GROUPING_PANEL_STATE} value={value}>
        {children}
      </FeatureStateScope>
    </FeatureStateScope>
  );
}

/**
 * The panel's state for this render, published for the strip, the column
 * menu and the header drag: its interactions with the keys, columns and
 * aggregations the grouping stage computed.
 */
function GroupingPanelStage<TRow>({
  groupBy,
  columns,
  source,
  groupingSource,
  entries,
  children,
}: Readonly<GroupingPanelStageProps<TRow>>): ReactNode {
  const interactions = useFeatureState(GROUPING_PANEL_STATE);
  const panel = useMemo(() => {
    const state = interactions?.panelState?.({
      groupBy,
      columns,
      source: {
        ...groupingSource,
        setGroupAggregateOverrides: source.setGroupAggregateOverrides,
      },
    });
    if (!state) return undefined;
    return {
      ...state,
      aggregations: groupingPanelAggregations({
        source: groupingSource,
        columns,
        declared: state.declaredAggregates,
        entries,
      }),
    };
  }, [
    columns,
    entries,
    groupBy,
    groupingSource,
    interactions,
    source.setGroupAggregateOverrides,
  ]);
  return (
    <FeatureStateScope stateKey={GROUPING_PANEL_VIEW_STATE} value={panel}>
      {children}
    </FeatureStateScope>
  );
}

/**
 * Add an interactive grouping panel while retaining the ordinary grouping
 * feature's options and row model.
 *
 * @public
 */
export function groupingPanel<TRow = unknown>(
  groupBy?: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  const base = grouping(groupBy ?? [], extras);
  return {
    ...base,
    ...coreGroupingPanel<TRow>(groupBy, extras),
    initialGroupBy: groupBy,
    extras,
    provider: { Provider: GroupingPanelProvider },
    renders: [
      slotRender<ChromeExtraDraw>(GROUPING_LIVE, (props) => (
        <LiveGrouping {...props} Panel={GroupingPanelStage} />
      )),
      GROUPING_PANEL_RENDER,
    ],
  } as GroupingPanelFeature<TRow>;
}
