import {
  type BulkActionRunnerState,
  injectBulkActionRunner,
} from "@adapttable/angular";
import type {
  BulkBarSlotProps,
  SelectionState,
} from "@adapttable/core/binding";
import { DestroyRef, inject, type Signal } from "@angular/core";

/**
 * Runs a kit's bulk bar against its live props. Confirmation and labels are
 * read when the action runs; only a successful outcome clears selection.
 *
 * @public
 */
export function injectBulkBarRunner(
  props: Signal<BulkBarSlotProps<SelectionState>>
): BulkActionRunnerState {
  const destroyRef = inject(DestroyRef);
  return injectBulkActionRunner({
    confirm: (request) => props().confirm(request),
    get cancelLabel() {
      return props().labels.cancel;
    },
    onComplete: (outcome) => {
      if (!destroyRef.destroyed && outcome.status === "success") {
        props().selection.clear();
      }
    },
  });
}
