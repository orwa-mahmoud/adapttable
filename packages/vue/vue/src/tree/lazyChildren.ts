/** Each active loader epoch owns its controller; late promises cannot cross it. */
import {
  createLazyChildrenController,
  type LazyChildrenOptions,
} from "@adapttable/core";
import type { LazyChildrenState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { requireScope, useExternalStore, useScopeActivity } from "../store";
export interface LazyChildrenVueOptions<
  TRow,
> extends LazyChildrenOptions<TRow> {
  readonly enabled?: MaybeRefOrGetter<boolean>;
}
export function useLazyChildren<TRow>(
  input: MaybeRefOrGetter<LazyChildrenVueOptions<TRow>>
): ComputedRef<LazyChildrenState<TRow>> {
  requireScope("useLazyChildren");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  const controller = shallowRef(createLazyChildrenController(options.value));
  const enabled = computed(
    () => active.value && toValue(options.value.enabled) !== false
  );
  watch(
    [enabled, () => options.value.onLoadChildren],
    ([live], _previous, onCleanup) => {
      const next = createLazyChildrenController(options.value);
      controller.value = next;
      const disconnect = next.connect();
      if (!live) disconnect();
      onCleanup(disconnect);
    },
    { immediate: true, flush: "sync" }
  );
  watch(options, (value) => controller.value.configure(value), {
    flush: "sync",
  });
  const snapshot = useExternalStore(controller);
  return computed(() => ({
    ...snapshot.value,
    loadIfNeeded: (row) => {
      if (enabled.value) controller.value.loadIfNeeded(row);
    },
  }));
}
export type { LazyChildrenState } from "@adapttable/core/binding";
