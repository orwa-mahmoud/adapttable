/**
 * What one `execute` call carries through the loop: the channel it reaches
 * the table through, where it says how far it has got, and the ledger a live
 * binding settles its view requests on.
 */
import type { AgentProgress } from "@adapttable/core";

import type { CapabilityRegistry } from "../capabilities/registry";
import { ApplyError, isThenable } from "../commands/command";
import { type ApplyCallLedger, ControlledApplyError } from "../controlledApply";
import { errorMessage } from "../errorMessage";
import type {
  AgentApply,
  AgentCapabilityContext,
  AgentObservation,
  CapabilityProgress,
} from "../types";

/**
 * The three things a call has that the session itself does not: the channel it
 * reaches the table through, where it may say how far it has got, and whether
 * it has invoked a host write yet — which decides whether a replayed identity
 * is a repeated mutation or a harmless re-read.
 */
export interface CallState {
  whenApplied?: () => Promise<void>;
  readonly observe: () => AgentObservation;
  /** Whether a host write callback has been invoked for this call. */
  invokedWrite: boolean;
  /** `apply`, reporting where each changing call leaves the table. */
  readonly apply: AgentApply;
  /** Where this call says how far it has got, when anything is listening. */
  readonly progress: ((progress: CapabilityProgress) => void) | undefined;
}

/**
 * Apply members that read the table rather than change it.
 *
 * A call to one of these says nothing about where the table has got to, so
 * tracing it would let a change made by somebody else stand in for progress
 * this action never made.
 */
const READING_APPLY: ReadonlySet<PropertyKey> = new Set([
  "readRows",
  "resolveRow",
]);

/**
 * `apply`, reporting where each changing call leaves the table.
 *
 * Every route a capability has to the table runs through this object, so the
 * revision read as one of its calls settles is the revision that call
 * produced. Wrapping it here rather than at each call site covers a host's
 * own capability handler, which the session never sees inside.
 *
 * A proxy rather than a copy: a host may hand over a class instance, whose
 * methods a spread would drop.
 */
export function traceApply(
  apply: AgentApply,
  settled: () => void,
  currentLedger: () => ApplyCallLedger | undefined
): AgentApply {
  return new Proxy(apply, {
    get(target, property) {
      currentLedger()?.assertActive();
      const member: unknown = Reflect.get(target, property);
      if (typeof member !== "function") return member;
      if (READING_APPLY.has(property)) {
        if (!currentLedger()) return member;
        return (...args: readonly unknown[]) => {
          currentLedger()?.assertActive();
          return Reflect.apply(
            member as (...args: readonly unknown[]) => unknown,
            target,
            args
          );
        };
      }
      const call = member as (...args: readonly unknown[]) => unknown;
      return (...args: readonly unknown[]): unknown => {
        const ledger = currentLedger();
        const ticket = ledger?.submit(property, args);
        if (ticket) return ticket.completion;
        if (ledger)
          return ledger.trackHostCall(
            () => Reflect.apply(call, target, args),
            settled
          );
        const outcome = Reflect.apply(call, target, args);
        if (!isThenable(outcome)) {
          settled();
          return outcome;
        }
        return Promise.resolve(outcome).then((value) => {
          settled();
          return value;
        });
      };
    },
  });
}

/**
 * Where one call says how far it has got, and how that is closed.
 *
 * A call that reported something closes with `null` when it settles, so a
 * surface is never left holding the last count beside a finished call. A call
 * that reported nothing says nothing, and a table with nowhere to send it is
 * handed no reporter at all.
 */
export function callProgress(
  report: ((given: AgentProgress | null) => void) | undefined,
  capability: string,
  idempotencyKey: string
): {
  readonly progress: ((given: CapabilityProgress) => void) | undefined;
  readonly close: () => void;
} {
  if (!report) return { progress: undefined, close: () => undefined };
  let reported = false;
  let closed = false;
  return {
    progress: (given) => {
      if (closed) return;
      reported = true;
      report({ ...given, capability, idempotencyKey });
    },
    close: () => {
      closed = true;
      if (!reported) return;
      reported = false;
      report(null);
    },
  };
}

/**
 * The check every governed step makes before the next side effect.
 *
 * Cancellation is not an approval question: a table with no `onApprove` is
 * still cancellable, and a write that has not started must not start.
 */
export function cancellationGuard(signal: AbortSignal | undefined): () => void {
  return () => {
    if (signal?.aborted !== true) return;
    throw new ApplyError("cancelled", "request cancelled");
  };
}

export function executionCallbacks(
  call: CallState
): Pick<AgentCapabilityContext, "whenApplied" | "reportProgress"> {
  return {
    ...(call.whenApplied ? { whenApplied: call.whenApplied } : {}),
    ...(call.progress ? { reportProgress: call.progress } : {}),
  };
}

export function attachCallLedger(
  call: CallState,
  ledger: ApplyCallLedger | undefined
): void {
  if (ledger) call.whenApplied = () => ledger.whenApplied();
}

export async function settleCapabilityRun(
  running: Promise<unknown>,
  ledger: ApplyCallLedger | undefined
): Promise<unknown> {
  if (!ledger) return running;
  const payload = await ledger.race(running);
  ledger.seal();
  const waiting = ledger.drain();
  if (waiting) await waiting;
  return payload;
}

export function controlledError(
  error: unknown,
  ledger: ApplyCallLedger | undefined
): ControlledApplyError | undefined {
  if (error instanceof ControlledApplyError) return error;
  if (!ledger?.used && !ledger?.invoked) return undefined;
  return new ControlledApplyError(
    error instanceof ApplyError ? error.code : "apply-failed",
    errorMessage(error),
    ledger.revision
  );
}

/**
 * A built-in result that describes the controlled view request itself carries
 * the revision that request settled at.
 */
export function controlledPayload(
  key: string,
  payload: unknown,
  revision: number,
  ledger: ApplyCallLedger | undefined,
  registry: CapabilityRegistry
): unknown {
  if (!ledger?.used || registry.builtIn(key)?.settlesView !== true)
    return payload;
  if (!payload || typeof payload !== "object") return payload;
  return { ...payload, revision };
}
