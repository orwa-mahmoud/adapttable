import {
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  useColumnMenu,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  h,
  type PropType,
  type SetupContext,
} from "vue";

import { columnClassNames, columnControls } from "./controls";
import { useManagedPanel } from "./ManagedPanel";

const propNames = {
  allColumns: {
    type: Array as PropType<ColumnMenuSlotProps<unknown>["allColumns"]>,
  },
  layout: { type: Object as PropType<ColumnMenuSlotProps<unknown>["layout"]> },
  labels: { type: Object as PropType<ColumnMenuSlotProps<unknown>["labels"]> },
  hasRowActions: {
    type: Boolean as PropType<ColumnMenuSlotProps<unknown>["hasRowActions"]>,
    default: undefined,
  },
  hasRowReorder: {
    type: Boolean as PropType<ColumnMenuSlotProps<unknown>["hasRowReorder"]>,
    default: undefined,
  },
  onAutoSize: {
    type: Function as PropType<ColumnMenuSlotProps<unknown>["onAutoSize"]>,
  },
  onAutoSizeColumn: {
    type: Function as PropType<
      ColumnMenuSlotProps<unknown>["onAutoSizeColumn"]
    >,
  },
  onSortColumn: {
    type: Function as PropType<ColumnMenuSlotProps<unknown>["onSortColumn"]>,
  },
  onFilterColumn: {
    type: Function as PropType<ColumnMenuSlotProps<unknown>["onFilterColumn"]>,
  },
  onRenameColumn: {
    type: Function as PropType<ColumnMenuSlotProps<unknown>["onRenameColumn"]>,
  },
  sortBy: { type: String as PropType<ColumnMenuSlotProps<unknown>["sortBy"]> },
  sortDir: {
    type: String as PropType<ColumnMenuSlotProps<unknown>["sortDir"]>,
  },
  groupingPanel: {
    type: Object as PropType<ColumnMenuSlotProps<unknown>["groupingPanel"]>,
  },
  dir: { type: String as PropType<ColumnMenuSlotProps<unknown>["dir"]> },
  featureHost: {
    type: Object as PropType<ColumnMenuSlotProps<unknown>["featureHost"]>,
  },
  classNames: {
    type: Object as PropType<ColumnMenuSlotProps<unknown>["classNames"]>,
  },
  container: {
    type: Object as PropType<ColumnMenuSlotProps<unknown>["container"]>,
  },
};
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
ColumnMenu.props = Object.keys(propNames) as (keyof typeof propNames)[];
