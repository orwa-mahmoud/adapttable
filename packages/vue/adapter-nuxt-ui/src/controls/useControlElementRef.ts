import type { ElementRef } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import { onScopeDispose } from "vue";

/** Reconcile both control ref channels as one stable set of native owners. */
export function useControlElementRef<TElement extends Element>(
  target: () => TElement | null | undefined,
  owners: () => readonly (ElementRef<TElement> | null | undefined)[]
): void {
  let active = true;
  onScopeDispose(() => {
    active = false;
  });
  let previous: readonly ElementRef<TElement>[] = [];
  let composed: ElementRef<TElement> | undefined;
  useElementRef(target, () => {
    const next: ElementRef<TElement>[] = [];
    for (const owner of owners())
      if (owner && !next.includes(owner)) next.push(owner);
    if (
      next.length === previous.length &&
      next.every((owner) => previous.includes(owner))
    )
      return composed;
    previous = next;
    // Capture this membership snapshot. Releasing it must never invoke a new
    // owner after another callback has already acquired the current target.
    const attached = new Set<ElementRef<TElement>>();
    composed = next.length
      ? (element) => {
          if (element === null) {
            const retiring = [...attached];
            attached.clear();
            for (const owner of retiring) owner(null);
            return;
          }
          for (const owner of next) {
            // An owner may synchronously dispose the control while receiving
            // its target. Never attach a later channel after that disposal.
            if (!active) return;
            attached.add(owner);
            owner(element);
          }
        }
      : undefined;
    return composed;
  });
}
