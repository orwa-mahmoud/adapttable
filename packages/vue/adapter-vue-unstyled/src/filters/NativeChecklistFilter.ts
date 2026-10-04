import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/filters";
import { defineComponent, h, type VNodeChild } from "vue";

import { nativeCheckbox } from "../nativeCheckbox";

/** Native controls for the binding-owned searchable, windowed checklist. */
export const NativeChecklistFilter = defineComponent(
  <TRow>(props: ChecklistFilterProps<TRow>) => {
    const model = useChecklistModel(() => props);
    const controls: ChecklistSlots<VNodeChild> = {
      Search: (control) =>
        h("input", {
          type: "search",
          value: control.value,
          "aria-label": control.label,
          "data-adapttable-part": "filter-checklist-search",
          class: control.className,
          onInput: (event: Event) => {
            const element = event.currentTarget as HTMLInputElement;
            control.onChange(element.value);
            element.value = control.value;
          },
        }),
      Button: (control) =>
        h(
          "button",
          { type: "button", onClick: control.onClick },
          control.label
        ),
      Checkbox: (control) =>
        h("label", { "data-adapttable-part": "filter-checklist-option" }, [
          nativeCheckbox({
            type: "checkbox",
            checked: control.checked,
            class: control.className,
            "data-adapttable-part": "filter-checkbox",
            onChange: (event: Event) => {
              control.onChange(
                (event.currentTarget as HTMLInputElement).checked
              );
            },
          }),
          control.label,
          h(
            "span",
            {
              class: control.countClassName,
              "data-adapttable-part": "filter-checklist-count",
            },
            control.count
          ),
        ]),
    };
    return () => ChecklistChrome({ model: model.value, controls });
  },
  {
    name: "NativeChecklistFilter",
    props: ["def", "source", "labels", "classNames"],
  }
);
