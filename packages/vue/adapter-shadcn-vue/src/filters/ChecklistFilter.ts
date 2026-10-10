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
  type PropType,
  type SetupContext,
  type VNodeChild,
} from "vue";

import {
  shadcnButton,
  shadcnInput,
  shadcnSelectionCheckbox,
} from "../controls";
import { filterClassNames } from "./presentation";

const controls: ChecklistSlots<VNodeChild> = {
  Search: (control) =>
    shadcnInput({
      ...control,
      attrs: {
        type: "search",
        class: control.className,
        "aria-label": control.label,
        "data-adapttable-part": "filter-checklist-search",
      },
    }),
  Button: (control) =>
    shadcnButton({
      attrs: {
        type: "button",
        class: "min-h-11 sm:min-h-9",
        onClick: control.onClick,
      },
      label: control.label,
    }),
  Checkbox: (control) =>
    h(
      "label",
      {
        class: [
          "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm",
          control.className,
        ],
        "data-adapttable-part": "filter-checkbox",
      },
      [
        shadcnSelectionCheckbox({
          attrs: { "aria-label": control.label },
          checked: control.checked,
          indeterminate: false,
          onToggle: () => control.onChange(!control.checked),
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
      ]
    ),
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

const ChecklistPresentation = defineComponent(
  (props: ChecklistFilterProps<unknown>) => {
    const model = useChecklistModel(() => ({
      ...props,
      classNames: filterClassNames(props.classNames),
    }));
    return () => ChecklistChrome({ model: model.value, controls });
  },
  {
    name: "ShadcnChecklistPresentation",
    props: checklistRuntimeProps,
  }
);

/** A typed boundary preserves the row contract without SFC macro traversal. */
export function ChecklistFilter<TRow>(
  props: ChecklistFilterProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(ChecklistPresentation, { ...context.attrs, ...props });
}
ChecklistFilter.props = Object.keys(checklistRuntimeProps);
