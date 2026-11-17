import {
  type BulkAction,
  type BulkActionContext,
  type BulkActionOutcome,
  type ConfirmHandler,
} from "@adapttable/core";
import { useState, useSyncExternalStore } from "react";

export { type BulkActionOutcome } from "@adapttable/core";

import { createBulkActionRunner } from "@adapttable/core/binding";

export { bulkActionErrorMessage } from "@adapttable/core/binding";

/**
 * Options for {@link useBulkActionRunner}.
 *
 * @public
 */
export interface UseBulkActionRunnerOptions {
  /** Confirmation handler for actions that declare a `confirm` block. */
  confirm: ConfirmHandler;
  /** Cancel label for confirm dialogs. */
  cancelLabel: string;
  /**
   * Called after EVERY run with its outcome — success or failure — so a
   * host can clear the selection on success and report failures. (Earlier
   * versions only called this on success, with no argument.)
   */
  onComplete?: (outcome: BulkActionOutcome) => void;
}

/**
 * The runner returned by {@link useBulkActionRunner}.
 *
 * @public
 */
export interface BulkActionRunner {
  /** Key of the action currently running, or `null`. */
  pending: string | null;
  /**
   * The value the last run rejected with, or `null`. Cleared when the
   * next run starts.
   */
  error: unknown;
  /**
   * Run a bulk action against the given ids (confirming first if needed).
   * Omit `context` for the plain page-selection scope.
   */
  run: (action: BulkAction, ids: string[], context?: BulkActionContext) => void;
}

/**
 * Headless runner for bulk actions: tracks the in-flight action key,
 * routes through the confirmation handler, catches rejections (exposed as
 * `error`, never an unhandled rejection), and calls `onComplete` with the
 * outcome of every run. Adapters render the buttons and call `run`.
 *
 * @param options - See {@link UseBulkActionRunnerOptions}.
 * @returns The {@link BulkActionRunner}.
 *
 * @public
 */
export function useBulkActionRunner({
  confirm,
  cancelLabel,
  onComplete,
}: UseBulkActionRunnerOptions): BulkActionRunner {
  const options = { confirm, cancelLabel, onComplete };
  const [runner] = useState(() => createBulkActionRunner(options));
  runner.configure(options);
  const { pending, error } = useSyncExternalStore(
    runner.subscribe,
    runner.getSnapshot,
    runner.getSnapshot
  );
  return { pending, error, run: runner.run };
}
