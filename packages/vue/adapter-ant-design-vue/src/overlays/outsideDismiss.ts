import { watch } from "vue";

/**
 * Calls `onOutside` for a pointer press that lands outside every element
 * `inside` names while `enabled` is true. Ant Design Vue's popovers close on
 * their own trigger; a panel opened from a toolbar button owns its dismissal.
 */
export function useOutsideDismiss(
  enabled: () => boolean,
  document: () => Document | undefined,
  inside: () => readonly (Element | null | undefined)[],
  onOutside: (event: MouseEvent) => void
): void {
  watch(
    [enabled, document],
    ([on, target], _previous, cleanup) => {
      if (!on || !target) return;
      const listener = (event: MouseEvent) => {
        const node = event.target;
        if (
          node instanceof Node &&
          inside().some((element) => element?.contains(node))
        )
          return;
        onOutside(event);
      };
      target.addEventListener("mousedown", listener, true);
      cleanup(() => target.removeEventListener("mousedown", listener, true));
    },
    { immediate: true, flush: "post" }
  );
}
