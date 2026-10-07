import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  useColumnMenu,
} from "@adapttable/vue/adapter";
import { createVNode, defineComponent, h, type SetupContext } from "vue";

import { columnClassNames, columnControls } from "./controls";
import { useManagedPanel } from "./ManagedPanel";

const propNames = [
  "allColumns",
  "layout",
  "labels",
  "hasRowActions",
  "hasRowReorder",
  "onAutoSize",
  "onAutoSizeColumn",
  "onSortColumn",
  "onFilterColumn",
  "onRenameColumn",
  "sortBy",
  "sortDir",
  "groupingPanel",
  "dir",
  "featureHost",
  "classNames",
  "container",
] satisfies (keyof ColumnMenuSlotProps<unknown>)[];
const Presentation = defineComponent(
  (props: ColumnMenuSlotProps<unknown>) => {
    const model = useColumnMenu(() => ({
      ...props,
      classNames: columnClassNames(props.classNames),
    }));
    const slots = { ...columnControls, Panel: useManagedPanel() };
    return () => h(ColumnMenuChrome, { model, slots });
  },
  { name: "ShadcnColumnMenu", props: propNames }
);
export function ColumnMenu<TRow>(
  props: ColumnMenuSlotProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(Presentation, { ...context.attrs, ...props });
}
ColumnMenu.props = propNames;
