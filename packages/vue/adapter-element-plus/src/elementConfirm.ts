import type { ConfirmHandler } from "@adapttable/vue";
import { ElMessageBox } from "element-plus";

/** A dismissed or unavailable kit dialog never runs the host's action. */
export const elementConfirm: ConfirmHandler = (request) => {
  if (typeof window === "undefined") return;
  void ElMessageBox.confirm(request.message, request.title, {
    confirmButtonText: request.confirmLabel,
    cancelButtonText: request.cancelLabel,
    type: request.danger ? "warning" : "info",
    distinguishCancelAndClose: true,
  }).then(request.onConfirm, () => undefined);
};
