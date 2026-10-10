/** Private coordination for binding-owned controlled view requests. */
import type { TableRuntimeView } from "@adapttable/core/binding";

import {
  type ControlledMethod,
  planControlledMutation,
} from "./controlledApplySnapshot";
import type { AgentObservation } from "./types";

export interface ControlledApplyReceipt {
  readonly ordinal: number;
  readonly producedRevision: number;
  readonly changed: boolean;
}
export class ControlledApplyError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly revision: number
  ) {
    super(message);
  }
}
export interface ApplyCallScope {
  readonly admitted: AgentObservation;
  readonly signal?: AbortSignal;
  guard(revision: number): void;
  reserveEffect(): void;
  accept(receipt: ControlledApplyReceipt): void;
}
export interface ApplyCallLedger {
  readonly invoked: boolean;
  readonly used: boolean;
  readonly revision: number;
  submit(
    method: PropertyKey,
    args: readonly unknown[]
  ): { readonly completion: Promise<void> } | null;
  trackLegacy(run: () => unknown, capture: () => void): unknown;
  assertActive(): void;
  observeLegacy(revision: number): void;
  seal(): void;
  drain(): Promise<void> | void;
  whenApplied(): Promise<void>;
  race<T>(work: Promise<T>): Promise<T>;
  close(): void;
}
export interface LiveApplyCoordinator {
  beginCall(scope: ApplyCallScope): ApplyCallLedger;
}
export interface LiveApplyInputs {
  view(): TableRuntimeView | undefined;
  observe(): AgentObservation;
  contract(): string;
  sourceEpoch(): number;
  revisionEpoch(): number;
  isCurrent(): boolean;
  readonly retirementSignal?: AbortSignal;
  bindingOwned(method: ControlledMethod): boolean;
  invoke(method: ControlledMethod, args: readonly unknown[]): void;
  flush(run: () => void): void;
  settle(capture: (reconcile?: () => void) => void): void | Promise<void>;
}
interface Job {
  readonly owner: object;
  readonly execute: () => void;
  readonly cancel: (error: ControlledApplyError) => void;
}
function supported(method: PropertyKey): method is ControlledMethod {
  return (
    method === "pinColumn" ||
    method === "hideColumn" ||
    method === "setColumnOrder" ||
    method === "moveColumn" ||
    method === "setSelection"
  );
}
function errorOf(error: unknown, revision: number): ControlledApplyError {
  if (error instanceof ControlledApplyError) return error;
  return new ControlledApplyError(
    "apply-failed",
    error instanceof Error ? error.message : "controlled apply failed",
    revision
  );
}
function copyArguments(args: readonly unknown[]): readonly unknown[] {
  return args.map((value) =>
    Array.isArray(value) ? [...(value as unknown[])] : value
  );
}

interface ApplyLane {
  readonly queue: Job[];
  readonly legacyPending: Set<object>;
  active: Job | undefined;
  epoch: number;
  pump(): void;
}
/** One lane belongs to the neutral live session, never to a framework global. */
export function createLiveApplyCoordinator(
  inputs: LiveApplyInputs
): LiveApplyCoordinator {
  const lane: ApplyLane = {
    queue: [],
    legacyPending: new Set(),
    active: undefined,
    epoch: 0,
    pump() {
      if (lane.active) return;
      const next = lane.queue.shift();
      if (!next) return;
      lane.active = next;
      next.execute();
    },
  };
  return { beginCall: (scope) => beginCall(inputs, lane, scope) };
}
function beginCall(
  inputs: LiveApplyInputs,
  lane: ApplyLane,
  scope: ApplyCallScope
): ApplyCallLedger {
  const owner = {};
  const admittedEpoch = lane.epoch;
  const admittedSourceEpoch = inputs.sourceEpoch();
  const contract = inputs.contract();
  const settlements: Promise<void>[] = [];
  const failures = new Set<(error: ControlledApplyError) => void>();
  let lastRevision = scope.admitted.viewRevision;
  let closed = false;
  let sealed = false;
  let invoked = false;
  let used = false;
  let ordinal = 0;
  let failure: ControlledApplyError | undefined;
  let listening = false;
  const ownedLegacy = new Set<object>();
  const fail = (error: ControlledApplyError): void => {
    if (failure || closed) return;
    failure = error;
    if (ownedLegacy.size > 0) {
      lane.epoch += 1;
      for (const token of ownedLegacy) lane.legacyPending.delete(token);
      ownedLegacy.clear();
    }
    // Cancelling an owned job splices the queue; retain the admission snapshot.
    for (const job of lane.queue.slice())
      if (job.owner === owner) job.cancel(error);
    if (lane.active?.owner === owner) lane.active.cancel(error);
    for (const reject of failures) reject(error);
  };
  const assertActive = (): void => {
    if (failure) throw failure;
    if (closed || scope.signal?.aborted)
      throw new ControlledApplyError(
        "cancelled",
        "the capability is no longer active",
        lastRevision
      );
    if (inputs.retirementSignal?.aborted || !inputs.isCurrent())
      throw new ControlledApplyError(
        "not-wired",
        "the session is no longer active",
        lastRevision
      );
  };
  const check = (): void => {
    assertActive();
    if (lane.epoch !== admittedEpoch)
      throw new ControlledApplyError(
        "revision-mismatch",
        "an earlier apply outcome is unconfirmed; read the table again",
        lastRevision
      );
    scope.guard(lastRevision);
    if (
      inputs.sourceEpoch() !== admittedSourceEpoch ||
      inputs.contract() !== contract
    )
      throw new ControlledApplyError(
        "revision-mismatch",
        "the table source or contract changed",
        lastRevision
      );
  };
  const abort = (): void =>
    fail(
      new ControlledApplyError(
        "cancelled",
        "controlled apply cancelled",
        lastRevision
      )
    );
  const retire = (): void =>
    fail(
      new ControlledApplyError(
        "not-wired",
        "the session was retired during controlled apply",
        lastRevision
      )
    );
  const listen = (): void => {
    if (listening || closed) return;
    listening = true;
    scope.signal?.addEventListener("abort", abort, { once: true });
    inputs.retirementSignal?.addEventListener("abort", retire, {
      once: true,
    });
  };
  const race = <T>(work: Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const failed = (error: ControlledApplyError): void => {
        if (settled) return;
        settled = true;
        failures.delete(failed);
        reject(error);
      };
      failures.add(failed);
      void work.then(
        (value) => {
          if (settled) return;
          settled = true;
          failures.delete(failed);
          resolve(value);
        },
        (error) => {
          if (settled) return;
          settled = true;
          failures.delete(failed);
          reject(
            error instanceof Error
              ? error
              : new Error("capability failed", { cause: error })
          );
        }
      );
      if (failure) failed(failure);
    });
  };
  const complete = (): void => {
    if (failure) throw failure;
  };
  const drain = (): Promise<void> | void => {
    if (settlements.length === 0) return complete();
    return race(Promise.all(settlements).then(complete));
  };
  return {
    get invoked() {
      return invoked;
    },
    get used() {
      return used;
    },
    get revision() {
      return lastRevision;
    },
    submit(method, args) {
      if (!supported(method) || !inputs.bindingOwned(method)) return null;
      used = true;
      listen();
      const copied = copyArguments(args);
      let resolve: () => void = () => undefined;
      let reject: (error: ControlledApplyError) => void = (_error) => undefined;
      const completion = new Promise<void>((done, failed) => {
        resolve = done;
        reject = failed;
      });
      // The ledger observes every rejection immediately, even if the handler
      // deliberately ignores the void-compatible setter's runtime promise.
      settlements.push(
        completion.then(
          () => undefined,
          (error) => {
            fail(errorOf(error, lastRevision));
          }
        )
      );
      if (closed || sealed || failure) {
        reject(
          failure ??
            new ControlledApplyError(
              "cancelled",
              "the capability no longer accepts apply requests",
              lastRevision
            )
        );
        return { completion };
      }
      const number = ++ordinal;
      let finished = false;
      let issued = false;
      let captured = false;
      const finish = (error?: ControlledApplyError): void => {
        if (finished) return;
        finished = true;
        const index = lane.queue.indexOf(job);
        if (index >= 0) lane.queue.splice(index, 1);
        if (lane.active === job) lane.active = undefined;
        if (error) {
          if (issued && !captured) lane.epoch += 1;
          reject(error);
          fail(error);
        } else resolve();
        lane.pump();
      };
      const job: Job = {
        owner,
        cancel: (error) => finish(error),
        execute: () => {
          try {
            check();
            if (lane.legacyPending.size > 0)
              throw new ControlledApplyError(
                "apply-pending",
                "wait for the earlier host mutation before requesting a controlled change",
                lastRevision
              );
            if (!inputs.bindingOwned(method))
              throw new ControlledApplyError(
                "not-wired",
                "the apply channel changed while this request was queued",
                lastRevision
              );
            const expectedEpoch = inputs.revisionEpoch();
            const before = inputs.view();
            const planned = planControlledMutation(method, copied, before);
            if (!planned.ok)
              throw new ControlledApplyError(
                planned.code,
                planned.message,
                lastRevision
              );
            const capture = (reconcile?: () => void): void => {
              if (finished) return;
              if (captured) {
                finish(
                  new ControlledApplyError(
                    "apply-failed",
                    "the delivery hook captured twice",
                    lastRevision
                  )
                );
                return;
              }
              try {
                assertActive();
                reconcile?.();
                if (finished) return;
                assertActive();
                const actual = inputs.view();
                const disposition = planned.plan.classify(actual);
                if (disposition !== "accepted")
                  throw new ControlledApplyError(
                    disposition === "foreign"
                      ? "revision-mismatch"
                      : "apply-not-confirmed",
                    disposition === "foreign"
                      ? "the table changed during controlled apply"
                      : "the host did not confirm the requested model state",
                    lastRevision
                  );
                const observation = inputs.observe();
                if (
                  inputs.sourceEpoch() !== admittedSourceEpoch ||
                  inputs.contract() !== contract
                )
                  throw new ControlledApplyError(
                    "revision-mismatch",
                    "the table source or contract changed during delivery",
                    lastRevision
                  );
                if (
                  inputs.revisionEpoch() !==
                    expectedEpoch + Number(planned.plan.changed) ||
                  (planned.plan.changed
                    ? observation.viewRevision <= lastRevision
                    : observation.viewRevision !== lastRevision)
                )
                  throw new ControlledApplyError(
                    "revision-mismatch",
                    "the observed model revision does not identify this apply",
                    lastRevision
                  );
                lastRevision = observation.viewRevision;
                captured = true;
                scope.accept({
                  ordinal: number,
                  producedRevision: lastRevision,
                  changed: planned.plan.changed,
                });
              } catch (error) {
                finish(errorOf(error, lastRevision));
              }
            };
            inputs.flush(() => {
              check();
              if (issued)
                throw new ControlledApplyError(
                  "apply-failed",
                  "flush invoked the apply callback twice",
                  lastRevision
                );
              scope.reserveEffect();
              invoked = true;
              issued = true;
              inputs.invoke(method, copied);
            });
            if (!issued)
              throw new ControlledApplyError(
                "apply-failed",
                "flush did not invoke the apply callback",
                lastRevision
              );
            const delivered = inputs.settle(capture);
            const afterDelivery = (): void => {
              if (finished) return;
              if (!captured)
                finish(
                  new ControlledApplyError(
                    "apply-not-confirmed",
                    "the delivery hook completed without model capture",
                    lastRevision
                  )
                );
              else finish();
            };
            if (delivered && typeof delivered.then === "function")
              void Promise.resolve(delivered).then(afterDelivery, (error) =>
                finish(errorOf(error, lastRevision))
              );
            else afterDelivery();
          } catch (error) {
            finish(errorOf(error, lastRevision));
          }
        },
      };
      lane.queue.push(job);
      lane.pump();
      return { completion };
    },
    assertActive,
    trackLegacy(run, capture) {
      listen();
      try {
        if (sealed)
          throw new ControlledApplyError(
            "cancelled",
            "the capability no longer accepts apply requests",
            lastRevision
          );
        check();
        if (lane.active || lane.queue.length > 0 || lane.legacyPending.size > 0)
          throw new ControlledApplyError(
            "apply-pending",
            "wait for earlier mutations before invoking another mutator",
            lastRevision
          );
      } catch (error) {
        const problem = errorOf(error, lastRevision);
        fail(problem);
        throw problem;
      }
      const token = {};
      lane.legacyPending.add(token);
      ownedLegacy.add(token);
      const captured = (): void => {
        assertActive();
        capture();
      };
      let result: unknown;
      try {
        scope.reserveEffect();
        invoked = true;
        result = run();
      } catch (error) {
        lane.legacyPending.delete(token);
        ownedLegacy.delete(token);
        throw error;
      }
      if (
        typeof result !== "object" ||
        result === null ||
        typeof (result as { then?: unknown }).then !== "function"
      ) {
        try {
          captured();
          return result;
        } finally {
          lane.legacyPending.delete(token);
          ownedLegacy.delete(token);
        }
      }
      const completion = Promise.resolve(result)
        .then((value) => {
          captured();
          return value;
        })
        .finally(() => {
          lane.legacyPending.delete(token);
          ownedLegacy.delete(token);
        });
      settlements.push(
        completion.then(
          () => undefined,
          (error) => {
            fail(errorOf(error, lastRevision));
          }
        )
      );
      return completion;
    },
    observeLegacy(revision) {
      lastRevision = revision;
    },
    seal() {
      sealed = true;
    },
    drain,
    whenApplied: () => Promise.resolve(drain()),
    race,
    close() {
      if (closed) return;
      if (
        ownedLegacy.size > 0 ||
        lane.active?.owner === owner ||
        lane.queue.some((job) => job.owner === owner)
      )
        fail(
          new ControlledApplyError(
            "cancelled",
            "the capability ended with pending controlled requests",
            lastRevision
          )
        );
      closed = true;
      scope.signal?.removeEventListener("abort", abort);
      inputs.retirementSignal?.removeEventListener("abort", retire);
      failures.clear();
    },
  };
}
