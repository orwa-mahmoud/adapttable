import {
  FilterTreeChrome,
  type FilterTreeBuilderProps,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import { ElCollapse, ElCollapseItem, ElFormItem, ElText } from "element-plus";
import {
  createVNode,
  defineComponent,
  h,
  type SetupContext,
  type VNodeChild,
} from "vue";

import { elementButton } from "../controls/button";
import ElementInput from "../controls/ElementInput.vue";
import ElementSelect from "../controls/ElementSelect.vue";

const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    h(
      ElFormItem,
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      {
        label: () =>
          h(
            ElText,
            {
              class: control.labelClassName,
              "data-adapttable-part": "filter-label",
            },
            { default: () => control.label }
          ),
        default: () =>
          h(ElementSelect, {
            value: control.value,
            options: control.options,
            class: control.className,
            "aria-label": control.label,
            "data-adapttable-part": control.part,
            onChange: control.onChange,
          }),
      }
    ),
  Input: (control) =>
    h(
      ElFormItem,
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      {
        label: () =>
          h(
            ElText,
            {
              class: control.labelClassName,
              "data-adapttable-part": "filter-label",
            },
            { default: () => control.label }
          ),
        default: () =>
          h(ElementInput, {
            value: control.value,
            type: control.type,
            class: control.className,
            "aria-label": control.label,
            "data-adapttable-part": "filter-input",
            onChange: control.onChange,
          }),
      }
    ),
  Button: (control) =>
    elementButton(
      {
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      control.label
    ),
  Disclosure: (control) =>
    h(
      ElCollapse,
      {
        modelValue: control.expanded ? ["query"] : [],
        class: control.className,
        "data-adapttable-part": "filter-tree",
        "onUpdate:modelValue": (value) =>
          control.onExpandedChange(
            Array.isArray(value) && value.includes("query")
          ),
      },
      {
        default: () =>
          h(
            ElCollapseItem,
            { name: "query" },
            {
              title: () =>
                h(
                  ElText,
                  {
                    class: control.summaryClassName,
                    "data-adapttable-part": "filter-tree-summary",
                  },
                  { default: () => control.label }
                ),
              default: () => control.children,
            }
          ),
      }
    ),
};

const treeProps = {
  defs: null,
  source: null,
  labels: null,
  registry: null,
  classNames: null,
  defaultExpanded: { type: Boolean, default: undefined },
} satisfies Record<keyof FilterTreeBuilderProps<unknown>, unknown>;

const ElementFilterTreePresentation = defineComponent(
  (props: FilterTreeBuilderProps<unknown>) => {
    const model = useFilterTreeModel(() => props);
    return () => FilterTreeChrome({ model: model.value, controls });
  },
  {
    name: "ElementFilterTreePresentation",
    props: treeProps,
  }
);

/** Preserve the canonical row contract without exposing versioned instance helpers. */
export function ElementFilterTree<TRow>(
  props: FilterTreeBuilderProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(ElementFilterTreePresentation, {
    ...context.attrs,
    ...props,
  });
}
ElementFilterTree.props = treeProps;
