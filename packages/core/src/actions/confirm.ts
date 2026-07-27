import type { RowAction } from "../types";
import { devWarn } from "../utils/devWarn";

/** A confirmation request raised by a row or bulk action. */
export interface ConfirmRequest {
  /** Dialog title. */
  title: string;
  /** Dialog message. */
  message: string;
  /** Confirm button label. */
  confirmLabel: string;
  /** Cancel button label. */
  cancelLabel: string;
  /** Marks the action destructive. */
  danger?: boolean;
  /** Runs when the user accepts. */
  onConfirm: () => void;
}

/** Shows a confirmation, then runs `onConfirm` if accepted. */
export type ConfirmHandler = (request: ConfirmRequest) => void;

/**
 * The default confirmation handler — a dependency-free `window.confirm`.
 * Adapters pass a styled handler when they have one.
 *
 * When no dialog exists at all (SSR, jsdom, some embedded webviews) the
 * action is DENIED: an environment that cannot ask must never approve a
 * destructive action on the user's behalf. Integrators in dialogless
 * environments pass their own `confirm` handler.
 */
export const defaultConfirm: ConfirmHandler = ({ message, onConfirm }) => {
  const native = (globalThis as { confirm?: (m?: string) => boolean }).confirm;
  if (typeof native !== "function") {
    devWarn(
      "no confirm dialog is available in this environment — the action was NOT run. Pass a `confirm` handler to support dialogless environments."
    );
    return;
  }
  if (native(message)) onConfirm();
};

/**
 * Normalize a `disabledReason` result. Per the action contract only a
 * *non-empty* string disables, so an empty string maps to `undefined` —
 * letting every adapter treat "disabled" as simply "reason is defined" and
 * fall back to the action label for tooltips. (A plain `|| undefined` would
 * trip `prefer-nullish-coalescing`; this keeps the falsy-empty intent.)
 */
export function resolveDisabledReason(
  reason: string | undefined
): string | undefined {
  return reason !== undefined && reason !== "" ? reason : undefined;
}

/**
 * Run a row action, routing through `confirm` first when the action
 * declares a `confirm` block.
 *
 * @typeParam TRow - The row type.
 * @param action - The action to run.
 * @param row - The row it was triggered on.
 * @param confirm - The confirmation handler.
 * @param cancelLabel - Cancel label for the dialog.
 */
export function runRowAction<TRow>(
  action: RowAction<TRow>,
  row: TRow,
  confirm: ConfirmHandler,
  cancelLabel: string
): void {
  if (!action.confirm) {
    action.onClick(row);
    return;
  }
  confirm({
    title: action.confirm.title,
    message: action.confirm.message(row),
    confirmLabel: action.confirm.confirmLabel,
    cancelLabel,
    danger: action.confirm.danger,
    onConfirm: () => action.onClick(row),
  });
}
