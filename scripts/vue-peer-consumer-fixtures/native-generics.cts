import Vue = require("vue");
import Native = require("@adapttable/vue-unstyled/features");
import Editing = require("@adapttable/vue/adapter");
interface Row {
  id: string;
  name: string;
}
function render(props: {
  cell: Editing.VueEditableCellProps<Row>;
  row: Editing.RowEditActionsProps<Row>;
  batch: Editing.BatchEditBarProps<Row>;
  field: Editing.FilterFieldOptions<Row>;
  checklist: Editing.ChecklistFilterProps<Row>;
  tree: Editing.FilterTreeBuilderProps<Row>;
  header: Editing.HeaderFilterOptions<Row>;
}) {
  return [
    Vue.h(Native.NativeEditableCell<Row>, props.cell),
    Vue.h(Native.NativeRowEditActions<Row>, props.row),
    Vue.h(Native.NativeBatchEditBar<Row>, props.batch),
    Vue.h(Native.NativeFilterField<Row>, props.field),
    Vue.h(Native.ChecklistFilter<Row>, props.checklist),
    Vue.h(Native.FilterTreeBuilder<Row>, props.tree),
    Vue.h(Native.NativeHeaderFilter<Row>, props.header),
  ];
}
export = render;
