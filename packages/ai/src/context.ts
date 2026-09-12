/**
 * The live permitted context — `@adapttable/ai/context`.
 *
 * One export, built from the live session, that any integration can send to
 * any model: what this table can do, what its columns are, and where its view
 * is right now. It performs no I/O, applies nothing, and reads no row values.
 *
 * It is deliberately not a second definition of anything. The capability
 * schemas are `guides.ts`'s, the wiring and exclusion answer is the registry's,
 * the filters are `filterCatalog.ts`'s. If a rule changes there it changes
 * here, because there is nothing here to change.
 *
 * `contract.version` names everything the table can do; `selection.version`
 * names that plus how much of it was selected. A backend acknowledges both, so
 * switching a profile cannot reuse a payload built for the other one.
 *
 * @packageDocumentation
 */
import {
  type AgentContextOptions,
  type AgentContextProfile,
  type AgentContextSelection,
  ContextIncludeError,
  DEFAULT_COMPACT_TOKENS,
  MAX_CONTEXT_BYTES,
  selectGuides,
  selectionVersion,
  utf8Bytes,
} from "./contextSelection";
import {
  type AgentContextContract,
  type AgentContextView,
  buildContract,
  buildView,
  type ContextCapability,
  type ContextColumn,
  contractVersion,
} from "./contextSnapshot";
import type {
  AgentAggregations,
  AgentFilter,
  AgentSession,
  RowProvenanceEnvelope,
  RowWindow,
} from "./types";

export {
  type AgentContextContract,
  type AgentContextOptions,
  type AgentContextProfile,
  type AgentContextSelection,
  type AgentContextView,
  type ContextCapability,
  type ContextColumn,
  ContextIncludeError,
  DEFAULT_COMPACT_TOKENS,
  MAX_CONTEXT_BYTES,
};

export {
  agentInstructions,
  type AgentInstructionsInput,
  renderAgentContext,
} from "./contextPrompt";
export { sampleColumns, sampleColumnValues } from "./contextSampling";
export { matchesType, SAMPLE_CAP } from "./contextSnapshot";

/** What a model is given about this table. @public */
export interface AgentContext {
  /** The table's permitted shape. Changes rarely. */
  readonly contract: AgentContextContract;
  /** Where the table is right now. Changes constantly. */
  readonly view: AgentContextView;
  /** What was selected, what was deferred, and how big it came out. */
  readonly selection: AgentContextSelection;
}

/** Everything the builder needs that the session does not already expose. */
export interface AgentContextInputs {
  /** Live filter definitions, already reduced to what the agent may use. */
  readonly filters?: readonly AgentFilter[];
  /** Aggregation choices, from the neutral aggregation rules. */
  readonly aggregations?: AgentAggregations;
  /**
   * Live values the host sampled for columns whose author opted in.
   *
   * Produced by `sampleColumnValues` on this same subpath and handed in,
   * never read here: the builder performs no I/O, and a sample is a read.
   * Column id to values; anything not listed keeps its authored examples.
   */
  readonly samples?: Readonly<Record<string, readonly unknown[]>>;
  /** Live view state the session's manifest does not carry. */
  readonly view?: {
    readonly page?: number;
    readonly limit?: number;
    readonly search?: string;
    readonly sortBy?: string;
    readonly sortDir?: "asc" | "desc";
    readonly groupBy?: string;
    readonly filters?: Readonly<Record<string, unknown>>;
    readonly pinnedColumns?: Readonly<Record<string, unknown>>;
    readonly pinnedRows?: Readonly<Record<string, unknown>>;
  };
}

/**
 * Build the permitted context for one table.
 *
 * @param session - The live session. Everything is read through it, so the
 *   permission predicate has already been applied to every key that arrives.
 * @param options - Profile, budget and expert overrides.
 * @param inputs - Live view and filter data the manifest does not carry.
 * @returns The contract, the view, and what the selector did.
 * @throws {@link ContextIncludeError} when `include` names a key this table
 *   does not offer — a request that cannot be met is an error, not a silence.
 *
 * @public
 */
export function buildAgentContext(
  session: AgentSession,
  options: AgentContextOptions = {},
  inputs: AgentContextInputs = {}
): AgentContext {
  const catalog = session.catalog();
  const contract = buildContract(
    session,
    catalog,
    inputs.filters ?? [],
    inputs.aggregations,
    inputs.samples
  );
  const chosen = selectGuides(
    contract.capabilities,
    // Read only for a capability actually under consideration, and through the
    // session, which refuses a key the agent may not use.
    (key) => session.describe(key),
    options
  );
  const selected: AgentContextContract = {
    ...contract,
    capabilities: chosen.capabilities,
  };
  const view = buildView(
    { revision: session.manifest().viewRevision, ...inputs.view },
    contract.filters
  );
  const profile: AgentContextProfile = options.profile ?? "compact";
  const measured = options.estimateTokens;
  const serialized = JSON.stringify(selected);
  return {
    contract: selected,
    view,
    selection: {
      profile,
      version: selectionVersion(
        contract.version,
        profile,
        chosen.selected,
        options
      ),
      selected: chosen.selected,
      deferred: chosen.deferred,
      contractBytes: utf8Bytes(selected),
      viewBytes: utf8Bytes(view),
      estimatedTokens: measured
        ? measured(serialized)
        : Math.ceil(serialized.length / 4),
      // False means nobody counted: the number is a rule of thumb, and a
      // caller comparing it against a provider's real limit should know.
      estimated: measured === undefined,
      ...(chosen.notes.length > 0 ? { notes: chosen.notes } : {}),
    },
  };
}

export { contractVersion };

/**
 * Wrap a row window as what it is: somebody's data, read at a revision.
 *
 * Every path that puts rows in front of a model goes through this — the
 * `read` tool, the JSON and MCP adapters, a browser tool — so cell text is
 * never handed over as a bare string that could read as an instruction.
 *
 * @param rows - The window the session returned.
 * @param revision - The view revision it was read at.
 * @returns The window, labelled.
 *
 * @public
 */
export function rowProvenance(
  rows: RowWindow,
  revision: number
): RowProvenanceEnvelope {
  return { source: "table-rows", untrusted: true, revision, rows };
}
