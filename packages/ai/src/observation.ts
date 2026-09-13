/**
 * What a table can do, decided once for every binding.
 *
 * A capability is wired when the host handed the session a callback for it, or
 * when the runtime the table is mounted on already offers it. That rule is the
 * same whether the rows come from a local engine or from a server, and it was
 * previously written out twice — once in the neutral path and once, by hand,
 * in the React binding, where a server-only table took the second copy.
 *
 * A binding's job is to say what its own runtime offers. Deciding what that
 * means is this module's, and nothing here knows about React, an engine, or a
 * transport.
 *
 * @packageDocumentation
 */
import type {
  ApprovalPresentation,
  TableSourceCapabilities,
} from "@adapttable/core";

import type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
import type { AgentPagination } from "./pagination";
import type {
  AgentAggregations,
  AgentApply,
  AgentColumn,
  AgentFilter,
  AgentObservation,
} from "./types";

/**
 * Operations a runtime offers of its own accord.
 *
 * Keyed by the same names {@link AgentApply} uses, so the two can be read
 * together without a translation table in the middle. `true` means the runtime
 * will honour it; absent or `false` means it will not, which is not the same
 * as the host refusing — a host callback can still supply it.
 *
 * @public
 */
export type RuntimeOperations = Readonly<Record<string, boolean>>;

/** The view state a binding reads off its own runtime. @public */
export interface ObservedView {
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortDir?: "asc" | "desc";
  readonly groupBy?: string;
  readonly filters?: unknown;
  readonly pinnedColumns?: Readonly<Record<string, "start" | "end">>;
  readonly pinnedRows?: {
    readonly top: readonly string[];
    readonly bottom: readonly string[];
  };
}

/** What a host decided about writing. @public */
export interface ObservedPolicy {
  readonly writePolicy?: WritePolicy;
  readonly approval: ApprovalPolicy;
  readonly presentation?: ApprovalPresentation;
  readonly commit?: CommitPolicy;
}

/** Everything a binding projects into an observation. @public */
export interface ObservationInputs {
  readonly tableId: string;
  readonly viewRevision: number;
  readonly featureIds: readonly string[];
  readonly columns: readonly AgentColumn[];
  readonly source: TableSourceCapabilities;
  /** What the runtime offers by itself. */
  readonly operations: RuntimeOperations;
  /** What the host wired directly, which wins wherever it is present. */
  readonly apply: AgentApply;
  readonly policy: ObservedPolicy;
  readonly view: ObservedView;
  readonly pagination: AgentPagination;
  readonly rowAddressScope: RowAddressScope;
  readonly readMax?: number;
  readonly aggregations?: AgentAggregations;
  readonly availableFilters?: readonly AgentFilter[];
}

/**
 * Whether one operation is available at all.
 *
 * Either source is enough, and neither is preferred: a host callback and a
 * runtime that already does it are two ways of answering the same question.
 */
function wired(
  inputs: ObservationInputs,
  ...names: readonly (keyof AgentApply)[]
): boolean {
  return names.some(
    (name) =>
      inputs.apply[name] !== undefined || inputs.operations[name] === true
  );
}

/**
 * The observation a session reads this table through.
 *
 * @param inputs - What the binding's own runtime and host can state.
 * @returns What the table can do, in the session's own terms.
 *
 * @public
 */
export function agentObservation(inputs: ObservationInputs): AgentObservation {
  const pages = inputs.pagination;
  return {
    tableId: inputs.tableId,
    viewRevision: inputs.viewRevision,
    featureIds: inputs.featureIds,
    columns: inputs.columns,
    source: inputs.source,
    writePolicy: inputs.policy.writePolicy ?? "allow",
    approval: inputs.policy.approval,
    ...(inputs.policy.presentation
      ? { presentation: inputs.policy.presentation }
      : {}),
    commit: inputs.policy.commit ?? "stage",
    hasPagination: wired(inputs, "setPage"),
    hasSearch: wired(inputs, "setSearch"),
    hasSort: wired(inputs, "setSort"),
    hasFilters: wired(inputs, "setFilters"),
    hasExport: wired(inputs, "runExport"),
    // Either way of changing a cell counts: a table that stages an edit is a
    // table that can be edited, and the commit policy is what says which.
    hasEdit: wired(inputs, "editCells", "stageCells"),
    hasReorder: wired(inputs, "reorderRows"),
    hasColumnPinning: wired(inputs, "pinColumn"),
    hasRowPinning: wired(inputs, "pinRow"),
    hasSelection: wired(inputs, "setSelection"),
    // A saved view needs the feature composed as well as the handler: the
    // handler alone has nowhere to put what it applies.
    hasSavedViews:
      inputs.featureIds.includes("saved-views") && wired(inputs, "applyView"),
    hasAdd: wired(inputs, "addRows"),
    hasDelete: wired(inputs, "deleteRows"),
    page: pages.page,
    limit: pages.pageSize,
    search: inputs.view.search ?? "",
    ...(inputs.view.sortBy === undefined ? {} : { sortBy: inputs.view.sortBy }),
    ...(inputs.view.sortDir === undefined
      ? {}
      : { sortDir: inputs.view.sortDir }),
    ...(inputs.view.groupBy === undefined
      ? {}
      : { groupBy: inputs.view.groupBy }),
    ...(inputs.view.pinnedColumns
      ? { pinnedColumns: inputs.view.pinnedColumns }
      : {}),
    ...(inputs.view.pinnedRows ? { pinnedRows: inputs.view.pinnedRows } : {}),
    ...(inputs.view.filters === undefined
      ? {}
      : { filters: inputs.view.filters }),
    ...(inputs.aggregations ? { aggregations: inputs.aggregations } : {}),
    ...(inputs.availableFilters
      ? { availableFilters: inputs.availableFilters }
      : {}),
    pagination: pages,
    // A page count derived from the same pagination the context publishes, so
    // the bound a session enforces and the pages a model is told about can
    // never disagree.
    pageMax:
      pages.totalPages ??
      Math.max(1, pages.page + (pages.hasNext === false ? 0 : 1)),
    ...(inputs.readMax === undefined ? {} : { readMax: inputs.readMax }),
    rowAddressScope: inputs.rowAddressScope,
  };
}
