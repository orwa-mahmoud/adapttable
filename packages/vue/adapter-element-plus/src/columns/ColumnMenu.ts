import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  useColumnMenu,
} from "@adapttable/vue/adapter";
import { createVNode, defineComponent, h, type SetupContext } from "vue";

import { elementColumnMenuSlots } from "./elementColumnMenuControls";

const menuProps = {
  allColumns: null,
  layout: null,
  labels: null,
  hasRowActions: Boolean,
  hasRowReorder: Boolean,
  onAutoSize: null,
  onAutoSizeColumn: null,
  onSortColumn: null,
  onFilterColumn: null,
  onRenameColumn: null,
  sortBy: null,
  sortDir: null,
  dir: null,
  groupingPanel: null,
  featureHost: null,
  classNames: null,
  container: null,
} satisfies Record<keyof ColumnMenuSlotProps<unknown>, unknown>;
const ElementColumnMenuPresentation = defineComponent(
  (props: ColumnMenuSlotProps<unknown>) => {
    const model = useColumnMenu(() => props);
    return () => h(ColumnMenuChrome, { model, slots: elementColumnMenuSlots });
  },
  { name: "ElementColumnMenuPresentation", props: menuProps }
);
export function ColumnMenu<TRow>(
  props: ColumnMenuSlotProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(ElementColumnMenuPresentation, {
    ...context.attrs,
    ...props,
  });
}
ColumnMenu.props = menuProps;
