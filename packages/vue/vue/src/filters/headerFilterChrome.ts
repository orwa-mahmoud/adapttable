import {
  bindHeaderFilterDismiss,
  createHeaderFilterOverlay,
  defaultFilterRegistry,
  filterLabel,
  hasActiveHeaderFilter,
  isHeaderFilterOpen,
} from "@adapttable/core";
import type { FilterHeaderControlProps } from "@adapttable/core/binding";
import {
  computed,
  getCurrentInstance,
  h,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import { useExternalStore, useScopeActivity } from "../store";
import type { FilterFieldOptions } from "./filterFieldChrome";
import type {
  FilterPanelSurfaceProps,
  FilterTriggerProps,
} from "./filterPanelChrome";
export interface HeaderFilterOptions<
  TRow,
> extends FilterHeaderControlProps<TRow> {
  readonly id?: string;
  readonly dir?: "ltr" | "rtl";
}
export function useHeaderFilter<TRow>(
  input: MaybeRefOrGetter<HeaderFilterOptions<TRow>>
) {
  const id = getCurrentInstance() ? useId() : toValue(input).id;
  if (!id)
    throw new Error(
      "AdaptTable: a headless header filter needs an explicit id."
    );
  const active = useScopeActivity();
  const store = createHeaderFilterOverlay({ key: toValue(input).def.key });
  const snapshot = useExternalStore(store);
  const mountedAnchor = shallowRef<HTMLElement | null>(null);
  let disposed = false;
  // Retain child registration before mount and while suspended, without
  // exposing an anchor to an inactive or disposed header filter.
  const anchor = computed(() =>
    !disposed && active.value ? mountedAnchor.value : null
  );
  watch(
    () => toValue(input).def.key,
    (key) => {
      store.dismiss();
      store.configure({ key });
    },
    { flush: "sync" }
  );
  onScopeDispose(() => {
    disposed = true;
    mountedAnchor.value = null;
    store.dismiss();
  });
  watch(
    active,
    (enabled) => {
      if (!enabled) store.dismiss();
    },
    { flush: "sync" }
  );
  const triggerRef = (element: HTMLElement | null) => {
    if (element === null || !disposed) mountedAnchor.value = element;
  };
  const close: FilterPanelSurfaceProps["onClose"] = (reason) => {
    if (disposed || !active.value) return;
    store.dismiss();
    if (reason === "escape" && anchor.value?.isConnected) anchor.value.focus();
  };
  return computed(() => {
    const options = toValue(input);
    const open = isHeaderFilterOpen(
      undefined,
      options.def.key,
      snapshot.value.localOpen
    );
    const registry = options.registry ?? defaultFilterRegistry;
    const trigger: FilterTriggerProps = {
      label: `${options.labels.filters}: ${filterLabel(options.def)}`,
      count: hasActiveHeaderFilter({
        def: options.def,
        source: options.source,
        registry,
      })
        ? 1
        : 0,
      attrs: {
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "data-adapttable-part": "filter-header-trigger",
        "data-adapttable-header-filter": id,
        class: options.className,
      },
      triggerRef,
      onPointerDown: () => undefined,
      onClick: () => {
        if (!disposed && active.value) store.setOpen(!open);
      },
    };
    const field: FilterFieldOptions<TRow> = {
      id: `adapttable-header-filter-${id}`,
      def: options.def,
      labels: options.labels,
      registry,
      source: bindHeaderFilterDismiss(options.source, {
        def: options.def,
        registry,
        closeOnSelect: options.closeOnSelect,
        dismiss: () => close(),
      }),
    };
    return {
      open,
      trigger,
      field,
      anchor: anchor.value,
      close,
      dir: options.dir ?? "ltr",
      resetKey: snapshot.value.resetKey,
    };
  });
}
export interface HeaderFilterChromeSlots<TRow> {
  readonly Trigger: (props: FilterTriggerProps) => VNodeChild;
  readonly Popover: (props: FilterPanelSurfaceProps) => VNodeChild;
  readonly Field: (props: FilterFieldOptions<TRow>) => VNodeChild;
}
export function HeaderFilterChrome<TRow>(props: {
  readonly model: ReturnType<typeof useHeaderFilter<TRow>>["value"];
  readonly controls: HeaderFilterChromeSlots<TRow>;
}): VNodeChild {
  const { model, controls } = props;
  for (const name of ["Trigger", "Popover", "Field"] as const)
    if (typeof controls[name] !== "function")
      throw new Error(
        `AdaptTable: HeaderFilterChrome requires the ${name} control slot.`
      );
  return h("span", null, [
    controls.Trigger(model.trigger),
    controls.Popover({
      open: model.open,
      anchor: model.anchor,
      label: model.trigger.label,
      dir: model.dir,
      onClose: model.close,
      children: h(
        "div",
        {
          key: model.resetKey,
          "data-adapttable-header-filter": model.field.id,
        },
        [controls.Field(model.field)]
      ),
    }),
  ]);
}
export type { FilterHeaderControlProps } from "@adapttable/core/binding";
