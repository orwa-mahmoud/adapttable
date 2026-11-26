/**
 * The grouping strip's state: the keys, the reader's aggregate choices and the
 * aggregation each column offers. Only the grouping panel builds it, so a
 * table without the panel never loads the aggregation rules.
 */
import { aggregationModel } from "../aggregate/aggregationModel";
import type { ColumnMetadata } from "../contracts/columns";
import type { TableSourceCapabilities } from "../contracts/source";
import { sourceCapabilities } from "../source/capabilities";
import type { QueryAggregate } from "../source/queryContract";
import type { QueryGroupRow } from "../source/queryGroups";
import type { GroupAggregateOverrides } from "./groupAggregateOverrides";
import type {
  GroupingPanelInteractions,
  GroupingPanelState,
} from "./groupingPanelModel";

/**
 * The grouping strip's state, built from the choices this render carries.
 *
 * Built from a published view instead, the list would describe the render
 * before the reader's click — which reads as the control doing nothing.
 *
 * @public
 */
export function groupingPanelState<TRow>(
  input: GroupingPanelStateInput<TRow> & {
    readonly interactions: GroupingPanelInteractions | undefined;
  }
): GroupingPanelState | undefined {
  const { interactions } = input;
  if (!interactions) return undefined;
  return panelStateOf(interactions, input);
}

/**
 * What a grouping panel's state is built from, beside its interactions.
 *
 * @public
 */
export interface GroupingPanelStateInput<TRow> {
  /** The keys the table groups by in this render. */
  readonly groupBy: readonly string[];
  /** The table's columns. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** What the source says about grouping and aggregates. */
  readonly source: GroupingPanelSource<TRow>;
}

/**
 * The part of a table's source a grouping panel reads.
 *
 * @public
 */
export interface GroupingPanelSource<TRow> {
  /** The aggregate the user chose per column, when the source keeps them. */
  readonly groupAggregateOverrides?: GroupAggregateOverrides;
  /** Writes the user's aggregate choices back to the source. */
  readonly setGroupAggregateOverrides?: (
    overrides: GroupAggregateOverrides
  ) => void;
  /** Every row after filtering, when the source holds the full dataset. */
  readonly allFilteredRows?: readonly TRow[];
  /** Groups the server computed. */
  readonly groups?: readonly QueryGroupRow<TRow>[];
  /** What the source can do. */
  readonly capabilities?: TableSourceCapabilities;
  /** Whether the source honours the aggregates it is asked for. */
  readonly honorsAggregates?: boolean;
  /** The aggregates the current query asks for. */
  readonly queryAggregates?: readonly QueryAggregate[];
  /** Operation ids the backend can compute. */
  readonly aggregateOperations?: readonly string[];
}

/** The grouping strip's state from its interactions and this render's inputs. */
export function panelStateOf<TRow>(
  interactions: GroupingPanelInteractions,
  { groupBy, columns, source }: GroupingPanelStateInput<TRow>
): GroupingPanelState {
  const grouping = sourceCapabilities({
    allFilteredRows: source.allFilteredRows,
    groups: source.groups,
    capabilities: source.capabilities,
  }).grouping;
  const overrides = source.groupAggregateOverrides ?? {};
  return {
    ...interactions,
    groupBy,
    aggregateOverrides: overrides,
    canSetAggregates:
      source.setGroupAggregateOverrides !== undefined &&
      (grouping !== "server" || source.honorsAggregates === true),
    aggregations: aggregationModel({
      columns,
      overrides,
      declared: interactions.declaredAggregates,
      queryAggregates: source.queryAggregates,
      source: {
        grouping,
        aggregateOperations:
          source.honorsAggregates === false ? [] : source.aggregateOperations,
      },
    }),
  };
}
