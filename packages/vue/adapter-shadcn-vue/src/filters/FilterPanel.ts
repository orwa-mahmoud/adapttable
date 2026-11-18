import {
  type DataTableClassNames,
  FilterPanelChrome,
  type FilterPanelModel,
  type FilterPanelSlots,
  type FilterWidget,
  filterWidgetComponent,
  withProps,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  h,
  type PropType,
  type SetupContext,
} from "vue";

import { shadcnButton } from "../controls";
import { cn } from "../lib/utils";
import { FilterDrawer } from "./FilterDrawer";
import { CustomField } from "./FilterField";
import { FilterPopover } from "./FilterPopover";
import { FilterTree } from "./FilterTree";
import { FilterTrigger } from "./FilterTrigger";
import { filterClassNames } from "./presentation";
import { usePanelClose } from "./usePanelClose";
import { FILTER_WIDGETS } from "./widgets";

export interface FilterPanelProps<TRow> {
  readonly model: FilterPanelModel<TRow>;
  readonly classNames?: DataTableClassNames;
}
// The presentation validates values; its key list preserves generic public
// components and Vue fallthrough attribute inference.
const filterPanelRuntimeProps = {
  model: { type: Object as PropType<FilterPanelProps<unknown>["model"]> },
  classNames: {
    type: Object as PropType<FilterPanelProps<unknown>["classNames"]>,
  },
};

/** Props of a panel whose fields are drawn with the given widgets. */
interface WidgetFilterPanelProps extends FilterPanelProps<unknown> {
  readonly widgets: readonly FilterWidget[];
}

/** The filters panel, drawing each field with the widget for its kind. */
export const WidgetFilterPanel = defineComponent(
  (props: WidgetFilterPanelProps) => {
    const { close, onCloseAutoFocus } = usePanelClose(() => props.model);
    const names = () => filterClassNames(props.classNames);
    const controls: FilterPanelSlots<unknown> = {
      Trigger: (control) => h(FilterTrigger, { control, classNames: names() }),
      Button: (control) =>
        shadcnButton({
          label: control.label,
          attrs: {
            type: "button",
            disabled: control.disabled,
            onClick: control.onClick,
            "data-adapttable-part": control.part,
            class: cn(
              "min-h-11 sm:min-h-9",
              control.part === "filters-close"
                ? names().filtersClose
                : undefined
            ),
          },
        }),
      Field: (control) => {
        const field = { ...control, classNames: names(), dir: props.model.dir };
        return control.registry.get(control.def.type)?.render
          ? h(CustomField, field)
          : h(
              filterWidgetComponent(
                control.def,
                control.registry,
                props.widgets
              ),
              field
            );
      },
      Tree: (control) =>
        h(FilterTree, {
          ...control,
          classNames: names(),
          dir: props.model.dir,
        }),
      Popover: (control) =>
        h(FilterPopover, {
          ...control,
          onCloseAutoFocus,
          className: cn(
            "w-96 max-w-[calc(100vw-2rem)] max-h-[min(40rem,var(--reka-popover-content-available-height))] overflow-y-auto",
            control.className
          ),
        }),
      Drawer: (control) =>
        h(FilterDrawer, {
          ...control,
          onCloseAutoFocus,
          classNames: names(),
          closeLabel: props.model.labels.cancel,
        }),
    };
    return () =>
      FilterPanelChrome({
        model: { ...props.model, close },
        classNames: names(),
        controls,
      });
  },
  {
    name: "ShadcnFilterPanel",
    props: {
      ...filterPanelRuntimeProps,
      widgets: {
        type: Array as PropType<WidgetFilterPanelProps["widgets"]>,
        required: true,
      },
    },
  }
);

export const FilterPanel = /* @__PURE__ */ withProps(function FilterPanel<TRow>(
  props: FilterPanelProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(WidgetFilterPanel, {
    ...context.attrs,
    ...props,
    widgets: FILTER_WIDGETS,
  });
}, Object.keys(filterPanelRuntimeProps));
