import {
  CHECKLIST_LIST_HEIGHT,
  type ChecklistWindow,
  checklistWindow,
  resolveLabels,
} from "@adapttable/core";
import type {
  ChecklistClassNames,
  ChecklistFilterProps,
  ChecklistFilterState,
  ChecklistSlots,
} from "@adapttable/core/binding";
import {
  computed,
  h,
  type MaybeRefOrGetter,
  shallowRef,
  toValue,
  type VNodeChild,
  watch,
} from "vue";

import { useScopeActivity } from "../store";
import { useChecklistFilter } from "./filterModels";
export function useChecklistWindow(
  count: MaybeRefOrGetter<number>,
  enabled: MaybeRefOrGetter<boolean>
) {
  const active = useScopeActivity();
  const element = shallowRef<HTMLElement | null>(null);
  const width = shallowRef(0);
  const scrollTop = shallowRef(0);
  const measure = () => {
    width.value = element.value?.clientWidth ?? 0;
    scrollTop.value = element.value?.scrollTop ?? 0;
  };
  watch(
    [element, active, () => toValue(enabled)],
    ([node, mounted, virtual], _old, cleanup) => {
      if (!node || !mounted || !virtual) return;
      measure();
      const Resize = node.ownerDocument.defaultView?.ResizeObserver;
      if (!Resize) return;
      const observer = new Resize(measure);
      observer.observe(node);
      cleanup(() => observer.disconnect());
    },
    { immediate: true, flush: "post" }
  );
  return {
    window: computed<ChecklistWindow>(() =>
      toValue(enabled)
        ? checklistWindow(toValue(count), scrollTop.value, width.value)
        : { start: 0, end: toValue(count), padTop: 0, padBottom: 0 }
    ),
    ref: (value: HTMLElement | null) => {
      element.value = value;
    },
    onScroll: measure,
  };
}
export function useChecklistModel<TRow>(
  input: MaybeRefOrGetter<ChecklistFilterProps<TRow>>
) {
  const state = useChecklistFilter(
    () => toValue(input).def,
    () => toValue(input).source
  );
  const window = useChecklistWindow(
    () => state.value.visible.length,
    () => state.value.virtualize
  );
  return computed(() => ({
    state: state.value,
    window: window.window.value,
    ref: window.ref,
    onScroll: window.onScroll,
    labels: resolveLabels(toValue(input).labels),
    classNames: toValue(input).classNames,
  }));
}
export interface ChecklistChromeModel {
  readonly state: ChecklistFilterState;
  readonly window: ChecklistWindow;
  readonly ref: (element: HTMLElement | null) => void;
  readonly onScroll: () => void;
  readonly labels: ReturnType<typeof resolveLabels>;
  readonly classNames?: ChecklistClassNames;
}
export function ChecklistChrome(props: {
  readonly model: ChecklistChromeModel;
  readonly controls: ChecklistSlots<VNodeChild>;
}): VNodeChild {
  const { state, window, labels, classNames: names = {} } = props.model;
  if (!state.available) return null;
  const { controls } = props;
  for (const name of ["Search", "Button", "Checkbox"] as const)
    if (typeof controls[name] !== "function")
      throw new Error(
        `AdaptTable: ChecklistChrome requires the ${name} control slot.`
      );
  return h(
    "div",
    {
      class: names.filterChecklist,
      "data-adapttable-part": "filter-checklist",
    },
    [
      controls.Search({
        label: labels.checklistSearch,
        value: state.query,
        onChange: state.setQuery,
        className: names.filterChecklistSearch,
      }),
      h(
        "div",
        {
          class: names.filterChecklistActions,
          "data-adapttable-part": "filter-checklist-actions",
        },
        [
          controls.Button({
            label: labels.selectAll,
            onClick: state.selectAllVisible,
          }),
          controls.Button({
            label: labels.checklistClear,
            onClick: state.clear,
          }),
        ]
      ),
      h(
        "div",
        {
          ref: (element: unknown) =>
            props.model.ref(element instanceof HTMLElement ? element : null),
          onScroll: props.model.onScroll,
          class: names.filterChecklistList,
          "data-adapttable-part": "filter-checklist-list",
          style: state.virtualize
            ? { overflow: "auto", maxHeight: `${CHECKLIST_LIST_HEIGHT}px` }
            : undefined,
        },
        [
          h("div", {
            "aria-hidden": true,
            style: { height: `${window.padTop}px` },
          }),
          ...state.visible.slice(window.start, window.end).map((item) =>
            h("div", { key: item.value }, [
              controls.Checkbox({
                label: item.label,
                count: String(item.count),
                checked: state.selected.includes(item.value),
                className: names.filterCheckbox,
                countClassName: names.filterChecklistCount,
                onChange: (value) => state.toggle(item.value, value),
              }),
            ])
          ),
          h("div", {
            "aria-hidden": true,
            style: { height: `${window.padBottom}px` },
          }),
          state.visible.length
            ? null
            : h("span", { role: "status" }, labels.checklistNoValues),
        ]
      ),
    ]
  );
}
export type {
  ChecklistClassNames,
  ChecklistFilterProps,
  ChecklistSlots,
} from "@adapttable/core/binding";
