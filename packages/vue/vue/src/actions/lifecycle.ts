/** Framework resource ownership only; interaction state stays in core. */
import type { FeatureMountContext } from "@adapttable/vue";
import { onScopeDispose, watch } from "vue";
export function featureActivity<TRow>(
  context: FeatureMountContext<TRow>
): () => boolean {
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  return () => !disposed && context.active.value;
}
export function connectWhileActive<TRow>(
  context: FeatureMountContext<TRow>,
  connect: () => () => void
): void {
  watch(
    context.active,
    (active, _old, onCleanup) => {
      if (active) onCleanup(connect());
    },
    { immediate: true, flush: "sync" }
  );
}
export function ownsTableEvent(root: HTMLElement, event: Event): boolean {
  const target = event.target;
  return (
    target instanceof Element &&
    target.closest('[data-adapttable-part="root"]') === root &&
    !event.defaultPrevented
  );
}
