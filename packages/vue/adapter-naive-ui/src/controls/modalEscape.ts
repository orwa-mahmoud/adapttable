import { onScopeDispose } from "vue";

import { scheduleTick } from "../scheduleTick";
/** Naive emits close after its topmost trap check but omits the originating event. */
export function useNaiveModalEscape(root: () => HTMLElement | null) {
  let pending: KeyboardEvent | undefined;
  onScopeDispose(() => {
    pending = undefined;
  });
  return {
    capture: (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      pending = event;
      scheduleTick(() => {
        if (pending === event) pending = undefined;
      });
    },
    allow: () => {
      const event = pending;
      if (!event) return true;
      if (event.defaultPrevented || event.isComposing) return false;
      return (
        event.target instanceof Element &&
        event.target.closest(
          '[role="dialog"],[role="alertdialog"],[role="menu"]'
        ) === root()
      );
    },
  };
}
