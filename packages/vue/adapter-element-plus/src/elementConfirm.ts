import type { ConfirmHandler } from "@adapttable/vue";
import { ElMessageBox, type MessageBoxActionHandlers } from "element-plus";
import { type AppContext, h, onDeactivated, onScopeDispose } from "vue";

interface ConfirmContext {
  readonly active: boolean;
  readonly appContext?: AppContext | null;
  readonly container?: HTMLElement;
  readonly dir?: "ltr" | "rtl";
}
interface OwnedDialog {
  close?: MessageBoxActionHandlers["close"];
}

/** Dispose only this table's native dialogs through their public action handlers. */
export function useElementConfirm(
  context: () => ConfirmContext
): ConfirmHandler {
  let dialogs: Set<OwnedDialog> | undefined;
  const closeOwned = () => {
    for (const dialog of dialogs ?? []) dialog.close?.();
  };
  onDeactivated(closeOwned);
  onScopeDispose(closeOwned);
  return (request) => {
    const owner = context();
    if (!owner.active || typeof window === "undefined") return;
    const dialog: OwnedDialog = {};
    dialogs ??= new Set();
    dialogs.add(dialog);
    void ElMessageBox.confirm(
      ({ close }: MessageBoxActionHandlers) => {
        dialog.close = close;
        return h("span", request.message);
      },
      request.title,
      {
        confirmButtonText: request.confirmLabel,
        cancelButtonText: request.cancelLabel,
        type: request.danger ? "warning" : "info",
        distinguishCancelAndClose: true,
        appendTo: owner.container,
        customStyle: { direction: owner.dir },
      },
      owner.appContext
    )
      .then(request.onConfirm, () => undefined)
      .finally(() => dialogs?.delete(dialog));
  };
}
