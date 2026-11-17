/**
 * Revision counting, the live apply surface and admission for a bound session.
 */
import { type TableRevisions } from "@adapttable/core";
import { type TableRuntime } from "@adapttable/core/binding";

import { revisionToken } from "./liveTable";
import { applyFromRuntime, applyLiveFilters } from "./tableAgentApply";
import { type TableAgentRuntimeOptions } from "./tableAgentObservation";
import type {
  AgentApply,
  AgentProgress,
  ApprovalResult,
  ApprovalSubject,
} from "./types";

/**
 * The view revision an agent session stamps its observations with.
 *
 * @public
 */
export interface RevisionCounter {
  /** Advance from a neutral table's revisions, and return the revision. */
  readonly bumpFrom: (revisions: TableRevisions) => number;
  /** Advance from a runtime view's stamp, and return the revision. */
  readonly bumpFromStamp: (stamp: string) => number;
  /** The revision as it stands. */
  readonly current: () => number;
}

/**
 * A counter that starts at 1 and moves by one whenever the stamp it is given
 * differs from the last one.
 *
 * The first stamp only records where the table is, so the same view always
 * reads the same revision and any change to it reads a higher one.
 *
 * @public
 */
export function createRevisionCounter(): RevisionCounter {
  let token: string | undefined;
  let revision = 1;
  const bumpFromToken = (nextToken: string): number => {
    if (token === undefined) {
      token = nextToken;
      return revision;
    }
    if (token === nextToken) return revision;
    token = nextToken;
    revision += 1;
    return revision;
  };
  return {
    bumpFrom(revisions: TableRevisions) {
      return bumpFromToken(revisionToken(revisions));
    },
    bumpFromStamp(stamp: string) {
      return bumpFromToken(stamp);
    },
    current() {
      return revision;
    },
  };
}

export function currentApply(
  options: TableAgentRuntimeOptions,
  runtime: TableRuntime
): AgentApply {
  const fromRuntime = applyFromRuntime(runtime, options, options.apply);
  const apply: AgentApply = { ...fromRuntime, ...options.apply };
  apply.setFilters = (filters) => {
    if (options.apply?.setFilters) {
      options.apply.setFilters(filters);
      return;
    }
    const applied = applyLiveFilters(runtime.view()?.query, filters);
    if (!applied) {
      throw new Error("setFilters is not wired");
    }
  };
  return apply;
}

/**
 * What {@link bindLiveSession} reads, each at the moment it needs it.
 *
 * The references are read at call time rather than captured, so a session
 * built once follows a binding whose options, runtime and handlers change
 * after it was built.
 *
 * @public
 */
export interface LiveSessionInputs {
  /** The binding's options as they stand. */
  readonly options: { readonly current: TableAgentRuntimeOptions };
  /** The live table as it stands. */
  readonly runtime: { readonly current: TableRuntime };
  /** The counter the session's observations are stamped from. */
  readonly revisions: RevisionCounter;
  /**
   * Commits a state change the binding still holds, before the session takes
   * its admission snapshot for a call.
   */
  readonly flushAdmission: { readonly current: () => void | Promise<void> };
  /** Whether the controller still owns this table identity and registry. */
  readonly isCurrent?: () => boolean;
  /** Wake pending admission when this session is retired; never aborts a handler. */
  readonly retirementSignal?: AbortSignal;
  /** Asks the table's own approval surface when the host set no `onApprove`. */
  readonly waitForChrome: {
    readonly current: (
      subject: ApprovalSubject,
      signal?: AbortSignal
    ) => Promise<ApprovalResult>;
  };
  /** Where a running capability's progress goes, and `null` when it stops. */
  readonly reportProgress: {
    readonly current: (report: AgentProgress | null) => void;
  };
  /**
   * Runs one view mutation this mapping implements and commits the state it
   * changes before returning.
   */
  readonly flush: (run: () => void) => void;
  /**
   * Optional delivery fence for controlled layout and explicit selection.
   * Invoke `capture` once after model delivery, passing any synchronous binding
   * reconciliation it needs. The capture checks cancellation before reconciling
   * and validates authoritative state before the hook completes. A delayed host
   * write is not confirmed merely because this hook resolved.
   * Omit for a binding whose setters commit synchronously.
   */
  readonly settleApply?: (
    capture: (reconcile?: () => void) => void
  ) => void | Promise<void>;
}

/** Wait for a framework commit without retaining a cancelled call. */
export function waitForAdmission(
  admission: Promise<void>,
  signal?: AbortSignal,
  retirementSignal?: AbortSignal
): Promise<void> {
  const signals = [signal, retirementSignal].filter(
    (current): current is AbortSignal => current !== undefined
  );
  if (signals.length === 0) return admission;
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (run: () => void): void => {
      if (settled) return;
      settled = true;
      for (const current of signals)
        current.removeEventListener("abort", abort);
      run();
    };
    const abort = (): void => finish(resolve);
    for (const current of signals)
      current.addEventListener("abort", abort, { once: true });
    // Keep the rejection handler even if cancellation wins, so a late failed
    // commit cannot become an unhandled rejection.
    void Promise.resolve(admission).then(
      () => finish(resolve),
      (error: unknown) =>
        finish(() =>
          reject(
            error instanceof Error
              ? error
              : new Error("admission failed", { cause: error })
          )
        )
    );
    if (signals.some((current) => current.aborted)) abort();
  });
}
