/** Fullscreen follows the actual root's document, never a remembered toggle. */
import type { FullscreenState } from "@adapttable/core/binding";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { requireScope, useScopeActivity } from "../store";
export type { FullscreenState } from "@adapttable/core/binding";

async function settled(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    /* Browser refusal is an ordinary outcome. */
  }
}
function leaveOwned(root: HTMLElement): void {
  if (root.ownerDocument.fullscreenElement === root)
    void settled(() => root.ownerDocument.exitFullscreen());
}

export function useFullscreen(
  element: MaybeRefOrGetter<HTMLElement | null | undefined>,
  activity?: MaybeRefOrGetter<boolean>
) {
  requireScope("useFullscreen");
  const enabled = activity ?? useScopeActivity();
  const target = computed(() => toValue(element) ?? null);
  const active = shallowRef(false);
  const supported = shallowRef(false);
  let disposed = false;
  let pending: object | undefined;
  const sync = (): void => {
    const root = target.value;
    supported.value =
      !disposed &&
      toValue(enabled) &&
      root !== null &&
      root.ownerDocument.fullscreenEnabled === true &&
      typeof root.requestFullscreen === "function";
    active.value =
      !disposed &&
      toValue(enabled) &&
      root !== null &&
      root.ownerDocument.fullscreenElement === root;
  };
  const request = (root: HTMLElement, entering: boolean): void => {
    if (disposed || pending || !toValue(enabled)) return;
    const ticket = {};
    pending = ticket;
    const finish = (): void => {
      if (
        entering &&
        (disposed || !toValue(enabled) || target.value !== root) &&
        root.ownerDocument.fullscreenElement === root
      ) {
        leaveOwned(root);
      }
      if (pending !== ticket) return;
      pending = undefined;
      sync();
    };
    // The async helper invokes the operation before its first await, retaining
    // the browser's synchronous user activation while catching sync throws too.
    void settled(() =>
      entering ? root.requestFullscreen() : root.ownerDocument.exitFullscreen()
    ).then(finish);
  };
  const exit = (): void => {
    const root = target.value;
    // Never close another table, video, or another document's fullscreen.
    if (root?.ownerDocument.fullscreenElement === root && root !== null)
      request(root, false);
  };
  watch(
    [target, () => toValue(enabled)],
    ([root, live], _previous, onCleanup) => {
      pending = undefined;
      sync();
      if (!root || !live) return;
      const doc = root.ownerDocument;
      doc.addEventListener("fullscreenchange", sync);
      doc.addEventListener("fullscreenerror", sync);
      onCleanup(() => {
        doc.removeEventListener("fullscreenchange", sync);
        doc.removeEventListener("fullscreenerror", sync);
        // A delayed request may complete after removal. Its completion only
        // resamples the current root and cannot resurrect this subscription.
        pending = undefined;
        leaveOwned(root);
      });
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(() => {
    disposed = true;
    pending = undefined;
    active.value = false;
    supported.value = false;
  });
  return computed((): FullscreenState => ({
    active: active.value,
    supported: supported.value,
    toggle: () => {
      const root = target.value;
      if (!root || !supported.value) return;
      request(root, root.ownerDocument.fullscreenElement !== root);
    },
    exit,
    container: active.value ? (target.value ?? undefined) : undefined,
  }));
}
