import {
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  onUpdated,
  watch,
} from "vue";

import type { ElementRef } from "./attrs";
import { requireScope } from "./store";

/** Own a native target for one setup scope, including callback replacement. */
export function useElementRef<TElement extends Element>(
  target: () => TElement | null | undefined,
  owner: () => ElementRef<TElement> | null | undefined
): void {
  requireScope("useElementRef");
  let currentTarget: TElement | null = null;
  let currentOwner: ElementRef<TElement> | null = null;
  let active = true;

  function release(): void {
    const previousOwner = currentOwner;
    const previousTarget = currentTarget;
    currentOwner = null;
    currentTarget = null;
    if (previousTarget !== null) previousOwner?.(null);
  }

  function reconcile(): void {
    if (!active) return;
    const nextTarget = target() ?? null;
    const nextOwner = owner() ?? null;
    if (nextTarget === currentTarget && nextOwner === currentOwner) return;
    release();
    if (!active) return;
    currentTarget = target() ?? null;
    currentOwner = owner() ?? null;
    if (currentTarget !== null) currentOwner?.(currentTarget);
  }

  onScopeDispose(() => {
    active = false;
    release();
  });
  watch([target, owner], reconcile, { immediate: true, flush: "post" });
  // Public component roots can change without changing instance identity.
  if (getCurrentInstance()) {
    onMounted(reconcile);
    onUpdated(reconcile);
  }
}
