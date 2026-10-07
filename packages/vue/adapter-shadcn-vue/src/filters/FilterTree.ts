import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  h,
  type SetupContext,
  type VNodeChild,
} from "vue";

import { shadcnButton, shadcnInput, shadcnSelect } from "../controls";
import { filterClassNames } from "./presentation";

const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    h(
      "label",
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      [
        h(
          "span",
          {
            class: control.labelClassName,
            "data-adapttable-part": "filter-label",
          },
          control.label
        ),
        shadcnSelect({
          ...control,
          attrs: {
            class: control.className,
            "aria-label": control.label,
            "data-adapttable-part": control.part,
          },
        }),
      ]
    ),
  Input: (control) =>
    h(
      "label",
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      [
        h(
          "span",
          {
            class: control.labelClassName,
            "data-adapttable-part": "filter-label",
          },
          control.label
        ),
        shadcnInput({
          ...control,
          attrs: {
            type: control.type,
            class: control.className,
            "aria-label": control.label,
            "data-adapttable-part": "filter-input",
          },
        }),
      ]
    ),
  Button: (control) =>
    shadcnButton({
      label: control.label,
      attrs: {
        type: "button",
        class: control.className ?? "min-h-11 sm:min-h-9",
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
    }),
  Disclosure: (control) =>
    h(
      "div",
      { class: control.className, "data-adapttable-part": "filter-tree" },
      [
        shadcnButton({
          label: control.label,
          attrs: {
            type: "button",
            class: control.summaryClassName,
            "data-adapttable-part": "filter-tree-summary",
            "aria-expanded": control.expanded,
            onClick: () => control.onExpandedChange(!control.expanded),
          },
        }),
        control.expanded ? control.children : null,
      ]
    ),
};
const propNames: (keyof FilterTreeBuilderProps<unknown>)[] = [
  "defs",
  "source",
  "labels",
  "classNames",
  "registry",
  "defaultExpanded",
];
const FilterTreePresentation = defineComponent(
  (props: FilterTreeBuilderProps<unknown>) => {
    const model = useFilterTreeModel(() => ({
      ...props,
      classNames: filterClassNames(props.classNames),
    }));
    return () => FilterTreeChrome({ model: model.value, controls });
  },
  { name: "ShadcnFilterTree", props: propNames }
);

export function FilterTree<TRow>(
  props: FilterTreeBuilderProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(FilterTreePresentation, { ...context.attrs, ...props });
}
FilterTree.props = propNames;
