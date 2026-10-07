import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  h,
  type SetupContext,
  type VNodeChild,
} from "vue";
import { VChip } from "vuetify/components/VChip";

import VuetifyButton from "../controls/VuetifyButton.vue";
import VuetifyCheckbox from "../controls/VuetifyCheckbox.vue";
import VuetifyInput from "../controls/VuetifyInput.vue";

const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    h(VuetifyInput, {
      attrs: {
        "aria-label": control.label,
        "data-adapttable-part": "filter-checklist-search",
        class: control.className,
      },
      type: "search",
      value: control.value,
      onChange: control.onChange,
    }),
  Button: (control) =>
    h(VuetifyButton, {
      attrs: { onClick: control.onClick },
      content: control.label,
    }),
  Checkbox: (control) =>
    h(
      "label",
      {
        "data-adapttable-part": "filter-checkbox",
        class: ["adapttable-vuetify-filter-checkbox", control.className],
      },
      [
        h(VuetifyCheckbox, {
          attrs: { "aria-label": control.label },
          checked: control.checked,
          onChange: control.onChange,
        }),
        h("span", control.label),
        h(
          VChip,
          {
            size: "x-small",
            variant: "tonal",
            class: control.countClassName,
            "data-adapttable-part": "filter-checklist-count",
          },
          () => control.count
        ),
      ]
    ),
};

/** The binding owns checklist search, facets, selection and windowing. */
const VuetifyChecklistFilterPresentation = defineComponent(
  (props: ChecklistFilterProps<unknown>) => {
    const model = useChecklistModel(() => props);
    return () => ChecklistChrome({ model: model.value, controls });
  },
  {
    name: "VuetifyChecklistFilterPresentation",
    props: ["def", "source", "labels", "classNames"],
  }
);

/** Keep the canonical generic props stable across supported Vue versions. */
export function VuetifyChecklistFilter<TRow>(
  props: ChecklistFilterProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(VuetifyChecklistFilterPresentation, {
    ...context.attrs,
    ...props,
  });
}
VuetifyChecklistFilter.props = ["def", "source", "labels", "classNames"];
