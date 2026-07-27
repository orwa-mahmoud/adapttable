import { useCallback, useState } from "react";

import type { BulkAction, BulkActionContext } from "../types";
import type { ConfirmHandler } from "./confirm";

/** A bulk-action rejection as display text, or `null` when there is none. */
export function bulkActionErrorMessage(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint"
  ) {
    return String(error);
  }
  try {
    return JSON.stringify(error) ?? "Unknown error";
  } catch {
    return "Unknown error";
  }
}

/** How a bulk-action run ended — passed to `onComplete` on every run. */
export type BulkActionOutcome =
  | { status: "success" }
  | { status: "error"; error: unknown };

/** Options for {@link useBulkActionRunner}. */
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

/** The runner returned by {@link useBulkActionRunner}. */
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
 */
export function useBulkActionRunner({
  confirm,
  cancelLabel,
  onComplete,
}: UseBulkActionRunnerOptions): BulkActionRunner {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(
    (action: BulkAction, ids: string[], context?: BulkActionContext) => {
      if (ids.length === 0) return;
      const scope: BulkActionContext = context ?? {
        allMatching: false,
        total: ids.length,
      };
      const fire = async () => {
        try {
          setPending(action.key);
          setError(null);
          await action.onClick(ids, scope);
          onComplete?.({ status: "success" });
        } catch (thrown) {
          setError(thrown);
          onComplete?.({ status: "error", error: thrown });
        } finally {
          setPending(null);
        }
      };
      if (action.confirm) {
        confirm({
          title: action.confirm.title,
          // The confirm count reflects the SCOPE: the whole matching set
          // when "select all matching" is active, the page ids otherwise.
          message: action.confirm.message(scope.total),
          confirmLabel: action.confirm.confirmLabel,
          cancelLabel,
          danger: action.confirm.danger,
          onConfirm: () => void fire(),
        });
      } else {
        void fire();
      }
    },
    [confirm, cancelLabel, onComplete]
  );

  return { pending, error, run };
}
