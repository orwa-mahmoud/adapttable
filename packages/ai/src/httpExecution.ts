/**
 * Request-phase execution context and ordered action dispatch.
 *
 * A backend answers one particular view of the table, and its reply arrives
 * seconds later. Binding the actions in that reply to whatever revision the
 * table happens to be at when they run is what let an edit made during the
 * model call authorize an outdated write: the substituted revision always
 * matched, so `session.execute` never had a conflict to reject.
 *
 * The phase context is the view that was answered, captured before the
 * request goes out. Actions that name no revision of their own belong to it.
 * The baseline then moves only for a revision the session itself reported
 * when one of this turn's own actions settled — never to whatever is newest.
 * That is what keeps an ordinary filter-then-sort reply working: the filter's
 * apply is the thing that advanced the table, and an unrelated edit cannot be
 * mistaken for it.
 *
 * No policy lives here. `session.execute` judges every action; this module
 * decides only which revision each action is judged against.
 */
import type { AgentManifest, AgentSession, ExecuteResult } from "./types";

/**
 * Identity of the table view one request phase was answered against.
 *
 * Captured at phase preparation — the moment the request describing that view
 * is built — so the reply can be bound to the view that produced it.
 */
export interface HttpPhaseContext {
  /** Host-supplied table identity. */
  readonly tableId: string;
  /** The permitted contract this phase exported. */
  readonly contractVersion: string;
  /** View revision the backend was shown. */
  readonly viewRevision: number;
  /** Logical turn this phase belongs to. */
  readonly turnId: string;
  /** Monotonic position of this phase within the turn. */
  readonly phaseId: number;
}

/** The part of an HTTP action the executor binds to a revision. */
export interface PhaseAction {
  /** Catalog key. */
  readonly key: string;
  /** Arguments for that key. */
  readonly args?: unknown;
  /** Caller-supplied replay key. */
  readonly idempotencyKey: string;
  /** Revision the backend named for itself, if any. */
  readonly expectedRevision?: number;
}

/** Actions a single phase returned, with the context they were decided on. */
export interface PhaseBatch {
  readonly context: HttpPhaseContext;
  readonly actions: readonly PhaseAction[];
}

/**
 * The policy surface a turn is answered under.
 *
 * Capabilities and the write / approval / commit rules are the part of the
 * table a backend cannot be allowed to have answered under different terms;
 * a change here ends the turn rather than being rebound to a new revision.
 */
export function policyKey(manifest: AgentManifest): string {
  return JSON.stringify({
    write: manifest.policy.write,
    approval: manifest.policy.approval,
    commit: manifest.policy.commit,
    capabilities: manifest.capabilities,
  });
}

/** Capture the view a phase is about to be answered against. */
export function phaseContext(
  session: AgentSession,
  turnId: string,
  phaseId: number
): HttpPhaseContext {
  const manifest = session.manifest();
  return {
    tableId: manifest.tableId,
    contractVersion: policyKey(manifest),
    viewRevision: manifest.viewRevision,
    turnId,
    phaseId,
  };
}

function cancelledResult(
  session: AgentSession,
  idempotencyKey: string
): ExecuteResult {
  return {
    ok: false,
    revision: session.manifest().viewRevision,
    idempotencyKey,
    error: { code: "cancelled", message: "agent HTTP cancelled" },
  };
}

/**
 * Ordered dispatch for one turn, owning the revision every action is bound to.
 *
 * The executor is the only thing that may associate a revision with an action:
 * a callback returning proves nothing about a React flush or a source update
 * that lands afterwards, so progress is read from the settled result the
 * session reports, not from the live manifest once the await has resumed.
 */
export function createTurnExecution(
  session: AgentSession,
  first: HttpPhaseContext
): {
  /** The revision this turn's own actions have proven the table reached. */
  readonly revision: () => number;
  readonly execute: (
    batch: PhaseBatch,
    signal?: AbortSignal
  ) => Promise<ExecuteResult[]>;
} {
  let proven = first.viewRevision;

  return {
    revision: () => proven,
    execute: async (batch, signal) => {
      // Two revisions are legitimately this batch's own: the view its phase
      // was answered against, and any later view this turn's executed actions
      // produced. Revisions only move forward, so the later of the two is the
      // one both describe. Anything beyond it came from outside the turn and
      // stays unproven, which is what makes the action stale.
      if (batch.context.viewRevision > proven) {
        proven = batch.context.viewRevision;
      }
      const results: ExecuteResult[] = [];
      for (const action of batch.actions) {
        if (signal?.aborted) {
          results.push(cancelledResult(session, action.idempotencyKey));
          continue;
        }
        // A revision the backend named for itself is its own claim about what
        // it saw, and goes to the session untouched. Naming the phase's own
        // revision is the same as omitting one: both mean "the view you
        // showed me".
        const named = action.expectedRevision;
        const expected =
          named !== undefined && named !== batch.context.viewRevision
            ? named
            : proven;
        const result = await session.execute(
          action.key,
          action.args ?? {},
          expected,
          action.idempotencyKey,
          signal
        );
        results.push(result);
        // The revision the session observed when THIS action settled. Reading
        // the manifest here instead would pick up anything that landed during
        // the await and count it as this turn's progress.
        if (result.ok) proven = result.revision;
      }
      return results;
    },
  };
}
