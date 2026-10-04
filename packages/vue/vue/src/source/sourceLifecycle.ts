import {
  type PaginationMode,
  type ResolvedPaginationMode,
  resolvePaginationMode,
} from "@adapttable/core";
import {
  computed,
  type MaybeRefOrGetter,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { type MaybeRefOrGetterOptional, useScopeActivity } from "../store";

/** Viewport options shared by the source tiers. @public */
export interface SourceViewportOptions {
  readonly paginationMode?: MaybeRefOrGetterOptional<PaginationMode>;
  readonly forceMobile?: MaybeRefOrGetterOptional<boolean>;
  readonly mobileBreakpoint?: MaybeRefOrGetterOptional<number>;
}

/** Shared responsive state. Browser observers start after mount. @public */
export function useViewportMobile(
  input: MaybeRefOrGetter<SourceViewportOptions>
): Readonly<ShallowRef<boolean>> {
  const active = useScopeActivity();
  const mobile = shallowRef(false);
  watch(
    [
      active,
      () => toValue(toValue(input).mobileBreakpoint) ?? 768,
      () => toValue(toValue(input).forceMobile),
    ],
    ([enabled, breakpoint, forced], _previous, onCleanup) => {
      if (
        !enabled ||
        forced !== undefined ||
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      )
        return;
      const media = window.matchMedia(`(max-width: ${String(breakpoint)}px)`);
      const update = (): void => {
        mobile.value = media.matches;
      };
      update();
      media.addEventListener("change", update);
      onCleanup(() => {
        media.removeEventListener("change", update);
      });
    },
    { immediate: true, flush: "sync" }
  );
  return computed(() => toValue(toValue(input).forceMobile) ?? mobile.value);
}

/** Resolve the source mode using the same viewport seam as table structure. */
export function useSourceMode(
  input: MaybeRefOrGetter<SourceViewportOptions>
): Readonly<ShallowRef<ResolvedPaginationMode>> {
  const mobile = useViewportMobile(input);
  return computed(() =>
    resolvePaginationMode(
      toValue(toValue(input).paginationMode) ?? "auto",
      mobile.value
    )
  );
}

/** Keep the frame shallow and commit only from the owning live scope. */
export function useSourceSnapshot<T>(
  read: () => T,
  commit: () => void,
  dispose?: () => void
): Readonly<ShallowRef<T>> {
  const frame = computed(read);
  const snapshot = shallowRef(frame.value);
  watch(
    frame,
    (value) => {
      snapshot.value = value;
    },
    { flush: "sync" }
  );
  const active = useScopeActivity();
  watch(
    active,
    (enabled, _previous, onCleanup) => {
      if (enabled && dispose) onCleanup(dispose);
    },
    { flush: "sync", immediate: true }
  );
  watch(
    [frame, active],
    () => {
      if (!active.value) return;
      commit();
    },
    { flush: "post", immediate: true }
  );
  return shallowReadonly(snapshot);
}
