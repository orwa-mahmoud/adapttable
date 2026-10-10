import {
  type BulkAction,
  type BulkActionContext,
  type BulkActionOutcome,
  type ConfirmHandler,
  createBulkActionRunner,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

/**
 * Options for {@link injectBulkActionRunner}.
 *
 * @public
 */
export interface BulkActionRunnerOptions {
  /** Asks before an action that declares a `confirm`. */
  readonly confirm: ConfirmHandler;
  /** The confirmation's cancel label. */
  readonly cancelLabel: string;
  /** Called after every run with its outcome. */
  readonly onComplete?: (outcome: BulkActionOutcome) => void;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * A bulk-action runner: which action is running, the last error, and the
 * run.
 *
 * @public
 */
export interface BulkActionRunnerState {
  /** Key of the action running now, or `null`. */
  readonly pending: Signal<string | null>;
  /** What the last run rejected with, or `null`. */
  readonly error: Signal<unknown>;
  /** Run an action against ids, confirming first when it asks. */
  readonly run: (
    action: BulkAction,
    ids: string[],
    context?: BulkActionContext
  ) => void;
}

/**
 * Run bulk actions against the selected rows, over core's runner.
 *
 * @param options - See {@link BulkActionRunnerOptions}.
 * @returns See {@link BulkActionRunnerState}.
 *
 * @public
 */
export function injectBulkActionRunner(
  options: BulkActionRunnerOptions
): BulkActionRunnerState {
  if (!options.injector) assertInInjectionContext(injectBulkActionRunner);
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const runner = createBulkActionRunner({
    confirm: (request) => {
      options.confirm({
        ...request,
        onConfirm: () => {
          if (!destroyRef.destroyed) request.onConfirm();
        },
      });
    },
    get cancelLabel() {
      return options.cancelLabel;
    },
    // An already-started host write still owns its completion outcome.
    get onComplete() {
      return options.onComplete;
    },
  });
  const snapshot = fromStore(runner, { injector });
  return {
    pending: computed(() => snapshot().pending),
    error: computed(() => snapshot().error),
    run: (action, ids, context) => {
      if (!destroyRef.destroyed) runner.run(action, ids, context);
    },
  };
}
