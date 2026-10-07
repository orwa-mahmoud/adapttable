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
import {
  VExpansionPanel,
  VExpansionPanels,
  VExpansionPanelText,
  VExpansionPanelTitle,
} from "vuetify/components/VExpansionPanel";

import VuetifyButton from "../controls/VuetifyButton.vue";
import VuetifyTreeField from "./VuetifyTreeField.vue";

const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) => h(VuetifyTreeField, { control }),
  Input: (control) => h(VuetifyTreeField, { control }),
  Button: (control) =>
    h(VuetifyButton, {
      attrs: {
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      content: control.label,
    }),
  Disclosure: (control) =>
    h(
      VExpansionPanels,
      {
        modelValue: control.expanded ? "advanced" : undefined,
        "onUpdate:modelValue": (value: unknown) =>
          control.onExpandedChange(value === "advanced"),
        variant: "accordion",
        class: control.className,
        "data-adapttable-part": "filter-tree",
      },
      () =>
        h(
          VExpansionPanel,
          { value: "advanced", elevation: 0 },
          {
            default: () => [
              h(
                VExpansionPanelTitle,
                {
                  class: control.summaryClassName,
                  "data-adapttable-part": "filter-tree-summary",
                },
                () => control.label
              ),
              h(VExpansionPanelText, { eager: true }, () => control.children),
            ],
          }
        )
    ),
};

/** Genuine Vuetify controls over the binding's recursive filter tree. */
const treeProps = {
  defs: null,
  source: null,
  labels: null,
  classNames: null,
  registry: null,
  defaultExpanded: { type: Boolean, default: undefined },
} satisfies Record<keyof FilterTreeBuilderProps<unknown>, unknown>;

const VuetifyFilterTreePresentation = defineComponent(
  (props: FilterTreeBuilderProps<unknown>) => {
    const model = useFilterTreeModel(() => props);
    return () => FilterTreeChrome({ model: model.value, controls });
  },
  {
    name: "VuetifyFilterTreePresentation",
    props: treeProps,
  }
);

/** Keep the canonical generic props stable across supported Vue versions. */
export function VuetifyFilterTree<TRow>(
  props: FilterTreeBuilderProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(VuetifyFilterTreePresentation, {
    ...context.attrs,
    ...props,
  });
}
VuetifyFilterTree.props = treeProps;
