/**
 * Which aggregates an agent may offer, and which it may set.
 *
 * The rules are core's — what a column can be aggregated by, what a server
 * source will honour, what the developer declared rather than the reader
 * chose. What lives here is the AI-specific part on top: the agent's own
 * column permissions, and the validation that turns a model's patch into
 * either a legal override or a refusal with a reason.
 *
 * It was in the React binding, reading a `TableRuntimeView`. Nothing about it
 * needed React — the grouping state a binding publishes is already plain data
 * and callbacks — so it takes that shape directly and a second binding gets
 * the same answers rather than its own.
 *
 * No aggregation is computed here and none is reimplemented: every decision
 * goes through core's helpers, so a rule changed there changes here too.
 */
import {
  addAggregation,
  BUILTIN_AGGREGATE_LABELS,
  type ColumnMetadata,
  declaredByDeveloper,
  type GroupAggregateOverrides,
  offerableOperations,
  type QueryAggregate,
  readerControlAllowed,
  removeAggregation,
  resolveAggregatable,
  restoreAggregationDefaults,
} from "@adapttable/core";

import type {
  AgentAggregationColumn,
  AgentAggregations,
  AgentAggregationsPatch,
} from "./types";

/**
 * The grouping state a binding publishes.
 *
 * Structurally what React's `groupingState` already is, so a binding passes
 * its own through rather than translating it.
 */
export interface AggregationState {
  /** The table's columns — the schema, not the visible subset. */
  readonly columns?: readonly ColumnMetadata<unknown>[];
  /** Aggregates currently in force. */
  readonly aggregateOverrides: GroupAggregateOverrides;
  /** The developer's original declaration, not what is on screen. */
  readonly queryAggregates?: readonly QueryAggregate[];
  /** Aggregate keys a host's mapper produced in a computed group row. */
  readonly computedAggregateKeys?: readonly string[];
  /** Operation ids the backend listed, when it named them. */
  readonly aggregateOperations?: readonly string[];
  /** Whether a server source will honour aggregate requests. */
  readonly honorsAggregates?: boolean;
  /** Absent when the host never wired reader control. */
  readonly setAggregateOverrides?: (overrides: GroupAggregateOverrides) => void;
}

/** Everything the decisions below need, and nothing about a framework. */
export interface AggregationInputs {
  readonly state: AggregationState | undefined;
  /** How the source groups, from its own declared capabilities. */
  readonly grouping: "client" | "server" | false | undefined;
  /** Whether the agent may read this column at all. */
  readonly allows: (key: string) => boolean;
}

/** What core needs to know about the source, or nothing when it cannot help. */
function aggregationSource(inputs: AggregationInputs):
  | {
      grouping: "client" | "server" | false | undefined;
      aggregateOperations: readonly string[] | undefined;
    }
  | undefined {
  const state = inputs.state;
  if (!state) return undefined;
  if (inputs.grouping === false) return undefined;
  // A server that groups but will not honour an aggregate request has nothing
  // to offer: advertising one would be a control that silently does nothing.
  if (inputs.grouping === "server" && state.honorsAggregates !== true) {
    return undefined;
  }
  return {
    grouping: inputs.grouping,
    aggregateOperations: state.aggregateOperations,
  };
}

/**
 * The aggregates this agent may offer, with what is active right now.
 *
 * A column the agent cannot read contributes nothing — not an empty entry, not
 * a label. Suppression is the reader's, and it applies before anything is
 * described.
 */
export function aggregationsFor(
  inputs: AggregationInputs
): AgentAggregations | undefined {
  const state = inputs.state;
  if (!state?.setAggregateOverrides) return undefined;
  const source = aggregationSource(inputs);
  if (!source) return undefined;
  const columns: AgentAggregationColumn[] = [];
  for (const column of state.columns ?? []) {
    if (!inputs.allows(column.key)) continue;
    const resolved = resolveAggregatable(column);
    const operations = offerableOperations(resolved, source);
    if (operations.length === 0) continue;
    columns.push({
      id: column.key,
      operations: operations.map((operation) => ({
        id: operation.id,
        label:
          operation.label ??
          BUILTIN_AGGREGATE_LABELS[operation.id] ??
          operation.id,
      })),
    });
  }
  if (columns.length === 0) return undefined;
  return {
    columns,
    active: columns
      .filter((column) => state.aggregateOverrides[column.id] !== undefined)
      .map((column) => ({
        id: column.id,
        operation: state.aggregateOverrides[column.id],
      })),
  };
}

/**
 * Validate a patch and apply it, or refuse with the reason.
 *
 * Every key is checked before anything is written, so a patch that names one
 * legal column and one forbidden one changes nothing at all — a half-applied
 * aggregate request is harder to explain than a refused one.
 */
/**
 * Refuse any requested operation this column does not offer, naming the ones
 * it does — a refusal that says only "no" leaves the caller where it started.
 */
function assertOperationsOffered(
  patch: AgentAggregationsPatch,
  byKey: Map<string, NonNullable<AggregationState["columns"]>[number]>,
  inputs: AggregationInputs,
  source: Parameters<typeof offerableOperations>[1]
): void {
  for (const [key, operationId] of Object.entries(patch.set ?? {})) {
    const column = byKey.get(key);
    const resolved = column ? resolveAggregatable(column) : undefined;
    const offered = resolved
      ? offerableOperations(resolved, source).map((operation) => operation.id)
      : [];
    if (inputs.allows(key) && resolved && offered.includes(operationId)) {
      continue;
    }
    throw new Error(
      offered.length > 0
        ? `"${key}" cannot use operation "${operationId}" — it takes ${offered.join(", ")}`
        : `"${key}" takes no aggregation`
    );
  }
}

export function applyAggregations(
  inputs: AggregationInputs,
  patch: AgentAggregationsPatch
): void {
  const state = inputs.state;
  if (!state?.setAggregateOverrides) {
    throw new Error("setAggregations is not wired");
  }
  if (patch.restoreDefaults) {
    state.setAggregateOverrides(restoreAggregationDefaults());
    return;
  }
  // Falling back to the raw source keeps a removal possible on a table that
  // offers nothing new: taking an aggregate off is not the same permission as
  // putting one on.
  const source = aggregationSource(inputs) ?? {
    grouping: inputs.grouping,
    aggregateOperations: state.aggregateOperations,
  };
  const byKey = new Map(
    (state.columns ?? []).map((column) => [column.key, column])
  );

  assertOperationsOffered(patch, byKey, inputs, source);
  for (const key of patch.remove ?? []) {
    const column = byKey.get(key);
    if (
      !inputs.allows(key) ||
      !column ||
      !readerControlAllowed(resolveAggregatable(column), source)
    ) {
      throw new Error(`"${key}" cannot be removed`);
    }
  }

  let next = { ...state.aggregateOverrides };
  for (const [key, operationId] of Object.entries(patch.set ?? {})) {
    next = addAggregation(next, key, operationId);
  }
  for (const key of patch.remove ?? []) {
    const column = byKey.get(key);
    if (!column) continue;
    next = removeAggregation(
      next,
      key,
      declaredByDeveloper(column, {
        columns: state.columns ?? [],
        overrides: state.aggregateOverrides,
        queryAggregates: state.queryAggregates,
        computedKeys: state.computedAggregateKeys,
        source,
      })
    );
  }
  state.setAggregateOverrides(next);
}
