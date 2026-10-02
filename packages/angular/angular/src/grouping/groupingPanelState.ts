/**
 * The interactive grouping panel state for Angular: a core controller over
 * the live table, published as a signal the grouping strip and the
 * {@link GROUPING_PANEL} slot draw from.
 */
import {
  createGroupingPanelController,
  declaredAggregates,
  groupingPanelAggregations,
  parseGroupBy,
  type TableRuntime,
  type TableSource,
} from "@adapttable/core";
import {
  type GroupingPanelSlotProps,
  groupingPanelState,
} from "@adapttable/core/binding";
import {
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import type { DataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";
import type { GroupingPanelExtras } from "../features/groupingPanel";
import { type RuntimeGrouping, tableRuntimeFor } from "../layout/tableRuntime";
import { fromStore } from "../store";

/**
 * A grouping-panel feature that also carries the seed keys and extras the
 * controller reads once.
 */
interface GroupingPanelFeature<TRow = unknown> extends AdaptTableFeature {
  readonly initialGroupBy?: string | readonly string[];
  readonly extras?: GroupingPanelExtras<TRow>;
}

/**
 * Options for {@link injectGroupingPanelState}.
 *
 * @public
 */
export interface GroupingPanelStateOptions<TRow> {
  /** The headless table. */
  readonly table: DataTable<TRow>;
  /** The live source the controller reads grouping from. */
  readonly source: Signal<TableSource<TRow>>;
  /** The composed features; the panel seeds from the one with id `grouping-panel`. */
  readonly features: readonly AdaptTableFeature[];
  /** The grouped entries, when the table groups its rows. */
  readonly grouping?: Signal<RuntimeGrouping<TRow> | undefined>;
  /** The injector to run effects in. */
  readonly injector?: Injector;
}

/**
 * Whether any composed feature is the grouping panel.
 */
function groupingPanelFeatureOf(
  features: readonly AdaptTableFeature[]
): GroupingPanelFeature | undefined {
  return features.find(
    (feature): feature is GroupingPanelFeature =>
      feature.id === "grouping-panel"
  );
}

/**
 * The grouping strip's live state when the panel feature is composed.
 * Absent otherwise — the slot draws nothing.
 *
 * @param options - See {@link GroupingPanelStateOptions}.
 * @returns The state as a signal, or `undefined` when the feature is off.
 *
 * @public
 */
export function injectGroupingPanelState<TRow>(
  options: GroupingPanelStateOptions<TRow>
): Signal<GroupingPanelSlotProps<ColumnDef<TRow>>> | undefined {
  const feature = groupingPanelFeatureOf(options.features);
  if (!feature) return undefined;

  const injector = options.injector ?? inject(Injector);
  const runtime = tableRuntimeFor(
    options.table,
    options.source,
    options.features,
    options.grouping
  );
  const extras = feature.extras ?? {};
  const controller = createGroupingPanelController({
    runtime: runtime as TableRuntime,
    groupAggregates: extras.groupAggregates,
  });

  const snapshot = fromStore(
    {
      subscribe: controller.subscribe,
      getSnapshot: controller.getSnapshot,
    },
    { injector }
  );

  // Once, after the table is up: the controller seeds the keys only when
  // nothing (the URL, a saved view) already carries some.
  effect(
    () => {
      untracked(() => {
        controller.initialize(feature.initialGroupBy);
      });
    },
    { injector }
  );

  // A link, a saved view or a configuration change can carry an operation a
  // column no longer allows; reconcile whenever what that depends on changes.
  const reconcileKey = computed(() => controller.reconcileKey());
  effect(
    () => {
      reconcileKey();
      untracked(() => {
        controller.reconcile();
      });
    },
    { injector }
  );

  const declared = declaredAggregates(extras.groupAggregates);

  return computed((): GroupingPanelSlotProps<ColumnDef<TRow>> => {
    const current = options.source();
    const interactions = controller.interactions(snapshot(), declared);
    const state = groupingPanelState({
      interactions,
      groupBy: parseGroupBy(current.groupBy),
      columns: options.table.allColumns(),
      source: {
        groupAggregateOverrides: current.groupAggregateOverrides,
        setGroupAggregateOverrides: current.setGroupAggregateOverrides,
        allFilteredRows: current.allFilteredRows,
        groups: current.groups,
        capabilities: current.capabilities,
        honorsAggregates: current.honorsAggregates,
        queryAggregates: current.queryAggregates,
        aggregateOperations: current.aggregateOperations,
      },
    });
    if (!state) {
      throw new Error("grouping panel composed without interactions");
    }
    const grouped = options.grouping;
    return {
      state:
        grouped === undefined
          ? state
          : {
              ...state,
              aggregations: groupingPanelAggregations({
                source: current,
                columns: options.table.allColumns(),
                declared,
                entries: grouped()?.entries,
              }),
            },
      columns: options.table.allColumns(),
      labels: options.table.labels(),
      mobile: options.table.isMobile(),
      dir: options.table.dir(),
    };
  });
}
