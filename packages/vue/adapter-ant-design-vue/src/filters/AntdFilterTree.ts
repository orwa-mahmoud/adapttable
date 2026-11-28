import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
  withProps,
} from "@adapttable/vue/adapter";
import {
  Collapse,
  CollapsePanel,
  FormItem,
  TypographyText,
} from "ant-design-vue";
import {
  createVNode,
  defineComponent,
  h,
  type SetupContext,
  type VNodeChild,
} from "vue";

import AntdInput from "../controls/AntdInput.vue";
import AntdSelect from "../controls/AntdSelect.vue";
import { antdButton } from "../controls/button";

const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    h(
      FormItem,
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      {
        label: () =>
          h(
            TypographyText,
            {
              class: control.labelClassName,
              "data-adapttable-part": "filter-label",
            },
            { default: () => control.label }
          ),
        default: () =>
          h(AntdSelect, {
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
      FormItem,
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      {
        label: () =>
          h(
            TypographyText,
            {
              class: control.labelClassName,
              "data-adapttable-part": "filter-label",
            },
            { default: () => control.label }
          ),
        default: () =>
          h(AntdInput, {
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
    antdButton(
      {
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      control.label
    ),
  Disclosure: (control) =>
    h(
      Collapse,
      {
        activeKey: control.expanded ? ["query"] : [],
        class: control.className,
        "data-adapttable-part": "filter-tree",
        onChange: (value: string | number | (string | number)[]) =>
          control.onExpandedChange(
            Array.isArray(value) && value.includes("query")
          ),
      },
      {
        default: () =>
          h(
            CollapsePanel,
            { key: "query" },
            {
              header: () =>
                h(
                  TypographyText,
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

const AntdFilterTreePresentation = defineComponent(
  (props: FilterTreeBuilderProps<unknown>) => {
    const model = useFilterTreeModel(() => props);
    return () => FilterTreeChrome({ model: model.value, controls });
  },
  {
    name: "AntdFilterTreePresentation",
    props: treeProps,
  }
);

/** Preserve the canonical row contract without exposing versioned instance helpers. */
export const AntdFilterTree = /* @__PURE__ */ withProps(function AntdFilterTree<
  TRow,
>(props: FilterTreeBuilderProps<TRow>, context: Pick<SetupContext, "attrs">) {
  return createVNode(AntdFilterTreePresentation, {
    ...context.attrs,
    ...props,
  });
}, treeProps);
