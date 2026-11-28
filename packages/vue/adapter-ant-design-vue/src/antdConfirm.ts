import type { ConfirmHandler } from "@adapttable/vue";
import { Modal } from "ant-design-vue";
import { type AppContext, onDeactivated, onScopeDispose } from "vue";

interface ConfirmContext {
  readonly active: boolean;
  readonly appContext?: AppContext | null;
  readonly container?: HTMLElement;
  readonly dir?: "ltr" | "rtl";
}
interface OwnedDialog {
  destroy?: () => void;
  container?: HTMLElement;
}

/**
 * A dialog that closes while its container is detached (a cached table that
 * deactivated) never receives its leave transition's end event, so it would
 * come back as a half-closed ghost. Ending the motion by hand lets the dialog
 * finish unmounting.
 */
function endLeaveMotion(container: HTMLElement | undefined): void {
  if (!container) return;
  const end = () => {
    for (const element of container.querySelectorAll(
      '[class*="-leave-active"]'
    )) {
      element.dispatchEvent(new Event("animationend", { bubbles: true }));
      element.dispatchEvent(new Event("transitionend", { bubbles: true }));
    }
  };
  // The motion starts listening a frame after the dialog begins to leave.
  for (const delay of [50, 300]) setTimeout(end, delay);
}

/** Dispose only this table's dialogs through their public `destroy` handles. */
export function useAntdConfirm(context: () => ConfirmContext): ConfirmHandler {
  let dialogs: Set<OwnedDialog> | undefined;
  const closeOwned = () => {
    for (const dialog of dialogs ?? []) {
      dialog.destroy?.();
      endLeaveMotion(dialog.container);
    }
  };
  onDeactivated(closeOwned);
  onScopeDispose(closeOwned);
  return (request) => {
    const owner = context();
    if (!owner.active || typeof window === "undefined") return;
    const dialog: OwnedDialog = { container: owner.container };
    // The dialog records the focused element only once its enter motion ends,
    // so a quick dismissal would otherwise leave focus on the page body.
    const opener = document.activeElement;
    dialogs ??= new Set();
    dialogs.add(dialog);
    const handle = Modal.confirm({
      title: request.title,
      content: request.message,
      okText: request.confirmLabel,
      cancelText: request.cancelLabel,
      okButtonProps: { danger: request.danger === true },
      centered: true,
      maskClosable: false,
      direction: owner.dir,
      getContainer: owner.container,
      appContext: owner.appContext ?? undefined,
      onOk: () => {
        request.onConfirm();
      },
      afterClose: () => {
        dialogs?.delete(dialog);
        const focused = document.activeElement;
        if (
          opener instanceof HTMLElement &&
          opener.isConnected &&
          (!focused ||
            focused === document.body ||
            focused.closest(".ant-modal-root"))
        )
          opener.focus({ preventScroll: true });
      },
    });
    dialog.destroy = handle.destroy;
  };
}
