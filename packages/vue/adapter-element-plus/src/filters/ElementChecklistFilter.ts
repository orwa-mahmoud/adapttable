import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
} from "@adapttable/vue/adapter";
import { ElText } from "element-plus";
import {
  createVNode,
  defineComponent,
  h,
  type PropType,
  type SetupContext,
  type VNodeChild,
} from "vue";

import { elementButton } from "../controls/button";
import ElementCheckbox from "../controls/ElementCheckbox.vue";
import ElementInput from "../controls/ElementInput.vue";

const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    h(ElementInput, {
      type: "search",
      value: control.value,
      "aria-label": control.label,
      "data-adapttable-part": "filter-checklist-search",
      class: control.className,
      onChange: control.onChange,
    }),
  Button: (control) =>
    elementButton({ onClick: control.onClick }, control.label),
  Checkbox: (control) =>
    h("div", { class: "adapttable-element-plus-checklist-option" }, [
      h(ElementCheckbox, {
        "data-adapttable-part": "filter-checkbox",
        class: control.className,
        label: control.label,
        labelVisible: true,
        checked: control.checked,
        onChange: control.onChange,
      }),
      h(
        ElText,
        {
          class: control.countClassName,
          "data-adapttable-part": "filter-checklist-count",
          type: "info",
          size: "small",
        },
        { default: () => control.count }
      ),
    ]),
};

// The presentation validates values; its key list preserves generic public
// components and Vue fallthrough attribute inference.
const checklistRuntimeProps = {
  def: { type: Object as PropType<ChecklistFilterProps<unknown>["def"]> },
  source: { type: Object as PropType<ChecklistFilterProps<unknown>["source"]> },
  labels: { type: Object as PropType<ChecklistFilterProps<unknown>["labels"]> },
  classNames: {
    type: Object as PropType<ChecklistFilterProps<unknown>["classNames"]>,
  },
};

const ElementChecklistFilterPresentation = defineComponent(
  (props: ChecklistFilterProps<unknown>) => {
    const model = useChecklistModel(() => props);
    return () => ChecklistChrome({ model: model.value, controls });
  },
  {
    name: "ElementChecklistFilterPresentation",
    props: checklistRuntimeProps,
  }
);

/** Preserve the canonical row contract without exposing versioned instance helpers. */
export function ElementChecklistFilter<TRow>(
  props: ChecklistFilterProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(ElementChecklistFilterPresentation, {
    ...context.attrs,
    ...props,
  });
}
ElementChecklistFilter.props = Object.keys(checklistRuntimeProps);
