/**
 * What any binding hands the AI runtime, and what it gets back.
 *
 * A binding's job is to say what the table is and to pass calls through. Every
 * decision on top of that — which columns an agent may read, what a reader is
 * shown beside Approve, when a value is unavailable rather than empty — is the
 * same on every framework, and lived in the React binding only because that is
 * the binding that exists.
 *
 * The rule that keeps this honest: a neutral snapshot carries the fields an
 * algorithm needs and callback interfaces, never a runtime view, an element, a
 * feature host or a hook. A projection from a framework's own shape into this
 * one is allowed to be small and explicit. A permission decision is not.
 */
import type { AgentApprovalProposal, AgentProgress } from "@adapttable/core";

import type { AgentContextInputs } from "./context";
import type {
  AgentManifest,
  AgentSession,
  CatalogEntry,
  WriteProposal,
} from "./types";

/**
 * How a host receives live updates.
 *
 * Declared here rather than in the React package because none of it is React:
 * a manifest, a session and a pending approval are what any binding publishes.
 *
 * @public
 */
export interface TableAgentBridge<TPending = unknown> {
  /** Called when the published manifest changes. */
  publish?: (manifest: AgentManifest) => void;
  /** Called with the live session after mount. */
  attach?: (session: AgentSession) => void;
  /**
   * Called when a write starts or stops waiting on a human.
   *
   * `execute` does not return while an approval is open, so a panel outside
   * the table has no other way to know the turn is parked rather than
   * thinking.
   */
  readonly approvals?: (pending: TPending | null) => void;
  /**
   * Called once with a reader for the table's live view and filter catalog.
   *
   * A reader rather than a value, and called once rather than per change: a
   * panel or an inspector outside the table calls it when it needs the view,
   * and gets what the table is showing at that moment. A value pushed on every
   * change would be a second copy of the table's state to keep in step.
   */
  readonly viewInputs?: (read: () => AgentContextInputs) => void;
  /**
   * Called when the set of capabilities the reader waved through changes.
   *
   * "Always allow" is remembered inside the table, and a panel mounted beside
   * it cannot read that state — the same reason `approvals` and `viewInputs`
   * are here. Without this, a reader can wave a capability through and have
   * nowhere to take it back.
   */
  readonly alwaysAllowed?: (state: AlwaysAllowedState) => void;
  /**
   * Called as a capability reports how far it has got, and once with `null`
   * when it stops.
   *
   * The same reason the three above are here: this happens inside a call the
   * panel is waiting on, and nothing outside the table can see it. Wiring it
   * is what gives a capability somewhere to report to — a table that does not
   * hands its capabilities no `reportProgress` at all.
   */
  readonly progress?: (report: AgentProgress | null) => void;
}

/**
 * What a reader has agreed to stop being asked about, and how to undo it.
 *
 * @public
 */
export interface AlwaysAllowedState {
  /** Capability keys currently waved through, for this contract. */
  readonly capabilities: readonly string[];
  /** Take one back. The next write of that capability asks again. */
  readonly revoke: (capability: string) => void;
}

/**
 * Reading a value the person in front of the table is entitled to see.
 *
 * Deliberately not the model's `before`. That value was read at the agent's
 * addressing scope and travels back to the backend, so widening it to make an
 * approval strip read nicely would be a disclosure. This one never leaves the
 * browser: it is looked up in the table already on screen, which is why a row
 * the current filter hides still shows its real value.
 *
 * The resolver itself belongs to the binding — it is the thing that knows how
 * to find a row. What it returns is not automatically transmitted anywhere.
 */
export interface ProposalResolver {
  /** The row's reader-facing name, when the table can supply one. */
  readonly rowLabel: (rowKey: string) => string | undefined;
  /**
   * The current value of one cell, or `undefined` when none can be read.
   *
   * `undefined` must mean "could not be looked up", not "is empty": the
   * difference is what a reader deciding on a write needs to know.
   */
  readonly cellValue: (rowKey: string, column: string) => unknown;
  /**
   * One value as this column writes it, when the column says how it reads.
   *
   * A salary column that shows `$170k` in every cell must not show `170` on
   * the card where a reader agrees to change it — that is the one screen
   * where an ambiguous number costs something. Takes the value rather than
   * the row, so the value a write proposes is formatted the same way as the
   * one it replaces. `undefined` when the column says nothing.
   */
  readonly cellText?: (
    rowKey: string,
    column: string,
    value: unknown
  ) => string | undefined;
  /** Whether the reader may see this column at all. */
  readonly readable: (column: string) => boolean;
  /** The column's reader-facing name, when the table can supply one. */
  readonly columnLabel: (column: string) => string | undefined;
}

/**
 * Turn a plan's proposals into what a reader is shown.
 *
 * Viewing a table is not entitlement to every cell in it, so a column the host
 * marked unreadable resolves to nothing here too — and "nothing" is reported
 * as unavailable rather than drawn as an empty cell, because a blank value and
 * a value nobody could look up are different facts. Unavailable is a fact
 * about a cell, so a proposal that names no column — a deleted row — carries
 * neither a before-value nor the claim that one was withheld.
 */
export function displayProposals(
  proposals: readonly WriteProposal[],
  resolve: ProposalResolver
): readonly AgentApprovalProposal[] {
  return proposals.map((proposal) => {
    const label = resolve.rowLabel(proposal.rowKey);
    // A proposal that names no column is not a cell edit — deleting a row
    // has no before-value to hide or to show. Only a cell can be
    // unavailable; reporting it for a row-level write would tell the reader
    // a value was withheld from them when there was never one to look up.
    const column = proposal.column;
    const before =
      column !== undefined && resolve.readable(column)
        ? resolve.cellValue(proposal.rowKey, column)
        : undefined;
    const columnLabel =
      column === undefined ? undefined : resolve.columnLabel(column);
    const text = (value: unknown): string | undefined =>
      column === undefined || value === undefined
        ? undefined
        : resolve.cellText?.(proposal.rowKey, column, value);
    const beforeText = text(before);
    const afterText = text(proposal.after);
    return {
      rowKey: proposal.rowKey,
      ...(label ? { rowLabel: label } : {}),
      ...(column === undefined ? {} : { column }),
      ...(columnLabel ? { columnLabel } : {}),
      ...(before !== undefined ? { before } : {}),
      ...(beforeText === undefined ? {} : { beforeText }),
      ...(column !== undefined && before === undefined
        ? { beforeUnavailable: true }
        : {}),
      ...(proposal.after !== undefined ? { after: proposal.after } : {}),
      ...(afterText === undefined ? {} : { afterText }),
    };
  });
}

/**
 * A stable, unambiguous name for everything a backend was told.
 *
 * Structured rather than joined with separators: a column id containing the
 * separator would otherwise be able to spell a different contract. Turn-specific
 * state is deliberately absent — a view revision moving is not the contract
 * changing — while labels, types, limits and row addressing are present,
 * because a backend that was told the wrong label writes the wrong prompt even
 * though every key is still the same.
 */
export function contractFingerprint(
  manifest: AgentManifest,
  catalog: readonly CatalogEntry[]
): string {
  return JSON.stringify({
    tableId: manifest.tableId,
    capabilities: [...manifest.capabilities].sort((a, b) => a.localeCompare(b)),
    columns: [...manifest.columns]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((column) => ({
        id: column.id,
        label: column.label,
        type: column.type,
        readable: column.readable,
        writable: column.writable,
        sortable: column.sortable,
      })),
    rowAddressing: manifest.rowAddressing,
    // Which operations a column takes is part of what this table is, so a
    // column gaining or losing one is a contract a backend has not been told.
    // Without it here the pin outlives the change and a caller keeps planning
    // against operations that are no longer on offer — or never learns the
    // ones that are.
    aggregateOperations: manifest.aggregateOperations,
    limits: manifest.limits,
    policy: manifest.policy,
    source: manifest.source,
    catalog: [...catalog]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((entry) => ({ key: entry.key, summary: entry.summary })),
  });
}
