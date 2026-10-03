/** Lifecycle bridge for adapter-owned ng-bootstrap modal surfaces. */
import {
  afterRenderEffect,
  DestroyRef,
  inject,
  type TemplateRef,
} from "@angular/core";
import { NgbModal, type NgbModalRef } from "@ng-bootstrap/ng-bootstrap/modal";

/** Keep a controlled slot and its native modal in sync, without body portals. */
export function bootstrapModal(options: {
  readonly open: () => boolean;
  readonly content: () => TemplateRef<unknown>;
  readonly container: () => HTMLElement;
  readonly titleId: string;
  readonly onClose: () => void;
}): void {
  const modal = inject(NgbModal);
  let ref: NgbModalRef | undefined;
  let alive = true;
  inject(DestroyRef).onDestroy(() => {
    alive = false;
    ref?.close();
    ref = undefined;
  });
  afterRenderEffect(() => {
    if (!options.open()) {
      ref?.close();
      ref = undefined;
      return;
    }
    if (ref) return;
    const current = modal.open(options.content(), {
      container: options.container(),
      animation: false,
      backdrop: true,
      keyboard: true,
      ariaLabelledBy: options.titleId,
      scrollable: true,
    });
    ref = current;
    const closed = (): void => {
      if (!alive || ref !== current) return;
      ref = undefined;
      options.onClose();
    };
    void current.result.then(closed, closed);
  });
}
