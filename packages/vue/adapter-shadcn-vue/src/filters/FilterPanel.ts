import {
  type DataTableClassNames,
  FilterPanelChrome,
  type FilterPanelModel,
  type FilterPanelSlots,
} from "@adapttable/vue/adapter";
import { createVNode, defineComponent, h, type SetupContext } from "vue";

import { shadcnButton } from "../controls";
import { cn } from "../lib/utils";
import { FilterDrawer } from "./FilterDrawer";
import { FilterField } from "./FilterField";
import { FilterPopover } from "./FilterPopover";
import { FilterTree } from "./FilterTree";
import { FilterTrigger } from "./FilterTrigger";
import { filterClassNames } from "./presentation";
import { usePanelClose } from "./usePanelClose";

export interface FilterPanelProps<TRow> {
  readonly model: FilterPanelModel<TRow>;
  readonly classNames?: DataTableClassNames;
}
const PanelPresentation = defineComponent(
  (props: FilterPanelProps<unknown>) => {
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
      Field: (control) =>
        h(FilterField, {
          ...control,
          classNames: names(),
          dir: props.model.dir,
        }),
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
            "w-96 max-w-[calc(100vw-2rem)] max-h-[min(80vh,40rem)] overflow-y-auto",
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
  { name: "ShadcnFilterPanel", props: ["model", "classNames"] }
);

export function FilterPanel<TRow>(
  props: FilterPanelProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(PanelPresentation, { ...context.attrs, ...props });
}
FilterPanel.props = ["model", "classNames"];
