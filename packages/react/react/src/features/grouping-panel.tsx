/**
 * Interactive row grouping — `@adapttable/<kit>/grouping-panel`.
 *
 * This entry owns its drag state, announcements, and the ordinary grouping
 * engine. Importing plain `grouping()` never reaches this module.
 */
import {
  createGroupingPanelController,
  declaredAggregates,
} from "@adapttable/core";
import { coreGroupingPanel } from "@adapttable/core/binding";
import { createTableEngine } from "@adapttable/core/engine";
import {
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { grouping, type GroupingExtras } from "./grouping";
import { GROUPING_PANEL_STATE } from "./groupingPanelKey";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  useTableRuntime,
} from "./providers";
import { FRONTEND_ROW_MODEL } from "./rowModelKey";
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
  } as GroupingPanelFeature<TRow>;
}
