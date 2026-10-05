import type {
  BatchEditBarProps,
  RowEditActionsProps,
  VueEditableCellProps,
} from "@adapttable/vue/editing";
import type {
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterTreeBuilderProps,
} from "@adapttable/vue/filters";
import type { HeaderFilterOptions } from "@adapttable/vue/header-filters";
import {
  NativeBatchEditBar,
  NativeChecklistFilter,
  NativeEditableCell,
  NativeFilterField,
  NativeFilterTree,
  NativeHeaderFilter,
  NativeRowEditActions,
} from "@adapttable/vue-unstyled/features";
import { h } from "vue";

interface Row {
  id: string;
  name: string;
}
export function nativeGenericRenders(props: {
  cell: VueEditableCellProps<Row>;
  row: RowEditActionsProps<Row>;
  batch: BatchEditBarProps<Row>;
  field: FilterFieldOptions<Row>;
  checklist: ChecklistFilterProps<Row>;
  tree: FilterTreeBuilderProps<Row>;
  header: HeaderFilterOptions<Row>;
}) {
  return [
    h(NativeEditableCell<Row>, { ...props.cell }),
    h(NativeRowEditActions<Row>, { ...props.row }),
    h(NativeBatchEditBar<Row>, { ...props.batch }),
    h(NativeFilterField<Row>, { ...props.field }),
    h(NativeChecklistFilter<Row>, { ...props.checklist }),
    h(NativeFilterTree<Row>, { ...props.tree }),
    h(NativeHeaderFilter<Row>, { ...props.header }),
  ];
}
