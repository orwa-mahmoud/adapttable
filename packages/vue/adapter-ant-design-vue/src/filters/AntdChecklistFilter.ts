import {
  ChecklistChrome,
  type ChecklistFilterProps,
  type ChecklistSlots,
  useChecklistModel,
  withProps,
} from "@adapttable/vue/adapter";
import { TypographyText } from "ant-design-vue";
import {
  createVNode,
  defineComponent,
  h,
  type PropType,
  type SetupContext,
  type VNodeChild,
} from "vue";

import AntdCheckbox from "../controls/AntdCheckbox.vue";
import AntdInput from "../controls/AntdInput.vue";
import { antdButton } from "../controls/button";

const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    h(AntdInput, {
      type: "search",
      value: control.value,
      "aria-label": control.label,
      "data-adapttable-part": "filter-checklist-search",
      class: control.className,
      onChange: control.onChange,
    }),
  Button: (control) => antdButton({ onClick: control.onClick }, control.label),
  Checkbox: (control) =>
    h("div", { class: "adapttable-ant-design-vue-checklist-option" }, [
      h(AntdCheckbox, {
        "data-adapttable-part": "filter-checkbox",
        class: control.className,
        label: control.label,
        labelVisible: true,
        checked: control.checked,
        onChange: control.onChange,
      }),
      h(
        TypographyText,
        {
          class: control.countClassName,
          "data-adapttable-part": "filter-checklist-count",
          type: "secondary",
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

const AntdChecklistFilterPresentation = defineComponent(
  (props: ChecklistFilterProps<unknown>) => {
    const model = useChecklistModel(() => props);
    return () => ChecklistChrome({ model: model.value, controls });
  },
  {
    name: "AntdChecklistFilterPresentation",
    props: checklistRuntimeProps,
  }
);

/** Preserve the canonical row contract without exposing versioned instance helpers. */
export const AntdChecklistFilter = /* @__PURE__ */ withProps(
  function AntdChecklistFilter<TRow>(
    props: ChecklistFilterProps<TRow>,
    context: Pick<SetupContext, "attrs">
  ) {
    return createVNode(AntdChecklistFilterPresentation, {
      ...context.attrs,
      ...props,
    });
  },
  Object.keys(checklistRuntimeProps)
);
