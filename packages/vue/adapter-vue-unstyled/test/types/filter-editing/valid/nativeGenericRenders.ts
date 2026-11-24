import type {
  BatchEditBarProps,
  ChecklistFilterProps,
  FilterFieldOptions,
  FilterTreeBuilderProps,
  HeaderFilterOptions,
  RowEditActionsProps,
  VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { ChecklistFilter as NativeChecklistFilter, FilterTreeBuilder as NativeFilterTree, NativeFilterField } from "@adapttable/vue-unstyled/filters";
import { NativeBatchEditBar, NativeEditableCell, NativeRowEditActions } from "@adapttable/vue-unstyled/editing";
import { NativeHeaderFilter } from "@adapttable/vue-unstyled/header-filters";
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
