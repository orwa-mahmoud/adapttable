/**
 * Per-table agent policy read from the runtime: sampled columns, view inputs,
 * refusals, exclusions and approval.
 */
import { type TableRuntime } from "@adapttable/core/binding";

import { aggregationsFor } from "./aggregationCommands";
import {
  resolveApproval,
  type SharedApproval,
  sharedApproval,
} from "./approvalConfig";
import {
  type ApprovalTransaction,
  settleDecisions,
} from "./approvalTransaction";
import { type ProposalResolver } from "./binding";
import type { AgentContextInputs } from "./context";
import { agentFiltersFromDefs } from "./filterCatalog";
import { type TableAgentColumnPatch } from "./liveTable";
import {
  aggregationInputs,
  findRow,
  type TableAgentRuntimeOptions,
} from "./tableAgentObservation";
import type {
  AgentCapabilityDefinition,
  AgentSession,
  ApprovalResult,
} from "./types";

/**
 * Column ids whose author asked for live values.
 *
 * The flag is the author's, so it is read from the contract rather than from
 * anything a reader can move. A column the agent may not read is not sampled
 * whatever it says — the sampler refuses it too, and asking twice is cheaper
 * than a read that comes back empty.
 *
 * @public
 */
export function sampledColumns(session: AgentSession): readonly string[] {
  return session
    .manifest()
    .columns.filter((column) => column.readable && column.ai?.sample === true)
    .map((column) => column.id);
}

/**
 * The live view and filter catalog, in the shape the context builder takes.
 *
 * The same values the observation carries, read straight off the runtime so
 * the caller does not have to rebuild an observation to get at them. What the
 * table cannot answer for is simply absent, and the sanitized view names the
 * gap rather than defaulting it. `samples` are the live values already read
 * for the columns whose author opted in.
 *
 * @public
 */
export function viewInputsFromRuntime(
  runtime: TableRuntime,
  options: TableAgentRuntimeOptions,
  samples: Readonly<Record<string, readonly unknown[]>>
): AgentContextInputs {
  const view = runtime.view();
  const query = view?.query;
  const filters = agentFiltersFromDefs(
    view?.filterDefs,
    view?.filterRegistry,
    options.columns
  );
  // The operations each column takes travel with the contract, not behind a
  // describe call: a caller that has to guess between "avg" and "average"
  // guesses wrong, and only finds out by being refused.
  const aggregations = aggregationsFor(aggregationInputs(view, options));
  return {
    ...(filters && filters.length > 0 ? { filters } : {}),
    ...(aggregations ? { aggregations } : {}),
    ...(Object.keys(samples).length > 0 ? { samples } : {}),
    view: {
      ...(query?.page === undefined ? {} : { page: query.page }),
      ...(query?.limit === undefined ? {} : { limit: query.limit }),
      ...(query?.search === undefined ? {} : { search: query.search }),
      ...(query?.sortBy ? { sortBy: query.sortBy } : {}),
      ...(query?.sortDir ? { sortDir: query.sortDir } : {}),
      ...(view?.groupingState?.groupBy
        ? { groupBy: view.groupingState.groupBy }
        : {}),
      ...(query?.extra ? { filters: query.extra } : {}),
      ...(view?.pinning?.columns
        ? {
            pinnedColumns: view.pinning.columns,
          }
        : {}),
      ...(view?.pinning?.rows
        ? {
            pinnedRows: view.pinning.rows,
          }
        : {}),
      ...(view?.columnLayout?.hidden
        ? { hiddenColumns: view.columnLayout.hidden }
        : {}),
      ...(view?.columnLayout?.keys
        ? { columnOrder: view.columnLayout.keys }
        : {}),
    },
  };
}

/**
 * A row-by-row refusal, with the reader's stated reason when they gave one.
 *
 * Every row still pending is refused. The reason travels with the refusal so
 * the receipt and the model-visible result can say why rather than only that.
 *
 * @public
 */
export function perItemRefusal(
  transaction: ApprovalTransaction,
  stated: string | undefined
): ApprovalResult {
  return {
    ...settleDecisions(transaction.decisions, "rejected"),
    ...(stated ? { reason: stated } : {}),
  };
}

/**
 * One comparable string for an exclusion list, order-insensitive.
 *
 * @public
 */
export function exclusionKey(keys: readonly string[] | undefined): string {
  return keys ? [...keys].sort((a, b) => a.localeCompare(b)).join("|") : "";
}

/**
 * What a capability does to the table, from the live catalog.
 *
 * Read through the session rather than kept in a list here: the definition is
 * the only thing that knows, and it is published on the catalog entry so
 * every surface reads the same answer. `undefined` without a session, without
 * a capability, or for a key the catalog does not list.
 *
 * @public
 */
export function capabilityKind(
  session: AgentSession | undefined,
  capability: string | undefined
): AgentCapabilityDefinition["kind"] | undefined {
  if (!session || capability === undefined) return undefined;
  return session.catalog().find((entry) => entry.key === capability)?.kind;
}

/**
 * The opt-in list, with an action's own demand for a human applied.
 *
 * The shared configuration is read directly; an action that sets
 * `approval: "required"` is read from the custom definition it was declared
 * on, so a capability that must always be confirmed never offers the control
 * however the table was configured.
 *
 * @public
 */
export function alwaysAllowFor(
  approval: SharedApproval | undefined,
  capabilities: readonly AgentCapabilityDefinition[] | undefined,
  capability: string | undefined
): readonly string[] {
  const shared = sharedApproval(approval);
  if (capability === undefined) return shared.alwaysAllow;
  const definition = capabilities?.find((entry) => entry.key === capability);
  return resolveApproval(shared, definition?.ai).alwaysAllow;
}

/**
 * How the reader's own table answers for a proposed write.
 *
 * Rows are looked up in the live runtime view. A column the host marked
 * unreadable reads as unreadable, and a proposed value is formatted by the
 * column's own `formatValue` against the row it would produce, so `170 → 175`
 * reads as `$170k → $175k` in the wording the cells use. `displayProposals`
 * turns these answers into what the reader is shown.
 *
 * @public
 */
export function readerResolver(
  runtime: TableRuntime,
  columns: Readonly<Record<string, TableAgentColumnPatch>> | undefined
): ProposalResolver {
  const view = runtime.view();
  const recordFor = (rowKey: string): Record<string, unknown> | undefined => {
    const row = findRow(runtime, rowKey);
    return row && typeof row === "object"
      ? (row as Record<string, unknown>)
      : undefined;
  };
  return {
    rowLabel: (rowKey) => {
      const row = findRow(runtime, rowKey);
      return row !== undefined && view?.rowLabel
        ? view.rowLabel(row)
        : undefined;
    },
    cellValue: (rowKey, column) => recordFor(rowKey)?.[column],
    cellText: (rowKey, column, value) => {
      const definition = runtime
        .view()
        ?.groupingState?.columns?.find((entry) => entry.key === column);
      const format = definition?.formatValue;
      const record = recordFor(rowKey);
      if (!format || !record) return undefined;
      return format({ ...record, [column]: value });
    },
    readable: (column) => columns?.[column]?.readable !== false,
    columnLabel: (column) => columns?.[column]?.label,
  };
}

export function asCallable(
  value: unknown
): ((...input: unknown[]) => unknown) | undefined {
  if (typeof value !== "function") return undefined;
  return value as (...input: unknown[]) => unknown;
}

/**
 * View mutations whose default implementation belongs to this mapping.
 *
 * They call the runtime's own setters. Committing those setters before the
 * call returns lets the session attribute the resulting table revision to the
 * exact apply call that made it. Host overrides are excluded: only the host
 * can say when its own async callback has settled.
 */
export const BINDING_VIEW_MUTATIONS: ReadonlySet<string> = new Set([
  "setPage",
  "setLimit",
  "setSearch",
  "setSort",
  "setFilters",
  "setGroupBy",
  "setAggregations",
  "pinColumn",
  "hideColumn",
  "moveColumn",
  "setColumnOrder",
  "pinRow",
  "setSelection",
]);
