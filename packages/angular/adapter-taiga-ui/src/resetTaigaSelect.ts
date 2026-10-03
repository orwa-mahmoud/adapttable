import { type DestroyRef } from "@angular/core";
import { type NgModel } from "@angular/forms";

/** Reset an action picker after Taiga finishes its value-accessor callback. */
export function resetTaigaSelect(model: NgModel, destroyRef: DestroyRef): void {
  queueMicrotask(() => {
    if (destroyRef.destroyed) return;
    model.control.setValue(null, {
      emitEvent: false,
      emitViewToModelChange: false,
    });
  });
}
