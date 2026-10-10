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
  type PropType,
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
const propNames = {
  defs: { type: Array as PropType<FilterTreeBuilderProps<unknown>["defs"]> },
  source: {
    type: Object as PropType<FilterTreeBuilderProps<unknown>["source"]>,
  },
  labels: {
    type: Object as PropType<FilterTreeBuilderProps<unknown>["labels"]>,
  },
  classNames: {
    type: Object as PropType<FilterTreeBuilderProps<unknown>["classNames"]>,
  },
  registry: {
    type: Object as PropType<FilterTreeBuilderProps<unknown>["registry"]>,
  },
  defaultExpanded: {
    type: Boolean as PropType<
      FilterTreeBuilderProps<unknown>["defaultExpanded"]
    >,
    default: undefined,
  },
};
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
FilterTree.props = Object.keys(
  propNames
) as (keyof FilterTreeBuilderProps<unknown>)[];
