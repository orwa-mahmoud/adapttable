/**
 * One pass of the loop for one call: validate, approve, apply, report.
 */
import { ApplyError } from "../commands/command";
import { type ApplyCallLedger, ControlledApplyError } from "../controlledApply";
import { errorMessage } from "../errorMessage";
import { normalizeCapabilityArgs } from "../normalizeArgs";
import type { ExecuteResult } from "../types";
import { isGoverned } from "./approval";
import {
  attachCallLedger,
  callProgress,
  type CallState,
  controlledError,
  controlledPayload,
  settleCapabilityRun,
  traceApply,
} from "./callState";
import { runCapability, unfinishedWrite } from "./govern";
import { executeFingerprint } from "./replay";
import {
  type Admitted,
  type LoopState,
  preflight,
  revalidate,
} from "./validate";

/** Where a controlled call's own guard reports a refusal. */
function controlledGuard(
  state: LoopState,
  key: string,
  admitted: Admitted
): (revision: number) => void {
  return (revision) => {
    try {
      revalidate(
        state,
        key,
        { ...admitted.observation, viewRevision: revision },
        isGoverned(admitted.definition)
      );
    } catch (error) {
      if (error instanceof ApplyError)
        throw new ControlledApplyError(error.code, error.message, revision);
      throw error;
    }
  };
}

export async function runExecute(
  state: LoopState,
  key: string,
  rawArgs: unknown,
  expectedRevision: number,
  idempotencyKey: string,
  signal?: AbortSignal
): Promise<ExecuteResult> {
  const { options, replay } = state;
  const args = normalizeCapabilityArgs(
    key,
    rawArgs,
    state.registry.get(key)?.guide.input
  );
  // Where this action itself left the table. `apply` is the one channel a
  // capability changes the table through — a built-in dispatches to it, a
  // host handler is handed it — so the revision read as one of those calls
  // settles is this action's own progress.
  let own: number | undefined;
  let ledger: ApplyCallLedger | undefined;
  const tracked = traceApply(
    options.apply,
    () => {
      own = options.observe().viewRevision;
      ledger?.observeLegacy(own);
    },
    () => ledger
  );

  // Named where the call’s own identity is, so a surface watching two
  // capabilities at once can tell which one moved.
  const { progress, close: closeProgress } = callProgress(
    options.onProgress,
    key,
    idempotencyKey
  );

  const call: CallState = {
    invokedWrite: false,
    apply: tracked,
    progress,
    observe: () => {
      ledger?.assertActive();
      return options.observe();
    },
  };

  const record = (result: ExecuteResult): ExecuteResult => {
    replay.set(idempotencyKey, {
      capabilityKey: key,
      fingerprint: executeFingerprint(
        key,
        ledger?.invoked || ledger?.used ? rawArgs : args
      ),
      args,
      mutation: call.invokedWrite || ledger?.invoked === true,
      result,
    });
    return result;
  };
  const fail = (code: string, message: string): ExecuteResult => {
    const result: ExecuteResult = {
      ok: false,
      revision: options.observe().viewRevision,
      idempotencyKey,
      error: { code, message },
    };
    if (code === "cancelled" || code === "revision-mismatch") return result;
    return record(result);
  };

  const resolved = preflight(state, key, args, expectedRevision);
  if ("code" in resolved) return fail(resolved.code, resolved.message);

  const controlledFailure = (error: ControlledApplyError): ExecuteResult => {
    const result: ExecuteResult = {
      ok: false,
      revision: ledger?.revision ?? resolved.observation.viewRevision,
      idempotencyKey,
      error: { code: error.code, message: error.message },
    };
    return ledger?.invoked || call.invokedWrite ? record(result) : result;
  };
  try {
    ledger = state.coordinator?.beginCall({
      admitted: resolved.observation,
      signal,
      guard: controlledGuard(state, key, resolved),
      reserveEffect: () =>
        replay.reserve(idempotencyKey, executeFingerprint(key, rawArgs)),
      accept: (receipt) => {
        own = receipt.producedRevision;
      },
    });
    attachCallLedger(call, ledger);
    const running = runCapability(
      state,
      resolved.definition,
      key,
      args,
      resolved.observation,
      signal,
      call
    );
    const initialPayload = ledger
      ? await settleCapabilityRun(running, ledger)
      : await running;
    // What this action reached, never where the table happens to be. An
    // action that applied nothing reports the revision it was admitted at,
    // and one that applied reports what its own last call settled at, so a
    // change that landed alongside it is left for whoever made it to account
    // for. The next command then meets that change as a mismatch it has to
    // re-read, which is the answer the session gives at every other awaited
    // boundary.
    //
    // A host write and a foreign write inside the same `apply` call are the
    // one pair this cannot separate: both move the same counter while that
    // call is in flight, and only the host knows which revision its own
    // write produced.
    const produced = own ?? resolved.observation.viewRevision;
    const payload = controlledPayload(
      key,
      initialPayload,
      produced,
      ledger,
      state.registry
    );
    const unfinished = unfinishedWrite(payload);
    if (unfinished) {
      return {
        ok: unfinished === "pending",
        revision: produced,
        idempotencyKey,
        result: unfinished === "pending" ? payload : undefined,
        error:
          unfinished === "cancelled"
            ? { code: "cancelled", message: "approval cancelled" }
            : undefined,
      };
    }
    return record({
      ok: true,
      revision: produced,
      idempotencyKey,
      result: payload,
    });
  } catch (error) {
    const controlled = controlledError(error, ledger);
    if (controlled) return controlledFailure(controlled);
    if (error instanceof ApplyError) return fail(error.code, error.message);
    return fail("apply-failed", errorMessage(error));
  } finally {
    ledger?.close();
    closeProgress();
  }
}
