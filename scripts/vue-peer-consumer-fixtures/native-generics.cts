import Vue = require("vue");
import Native = require("@adapttable/vue-unstyled/features");
import Editing = require("@adapttable/vue/editing");
import Filters = require("@adapttable/vue/filters");
import Header = require("@adapttable/vue/header-filters");
interface Row {
  id: string;
  name: string;
}
function render(props: {
  cell: Editing.VueEditableCellProps<Row>;
  row: Editing.RowEditActionsProps<Row>;
  batch: Editing.BatchEditBarProps<Row>;
  field: Filters.FilterFieldOptions<Row>;
  checklist: Filters.ChecklistFilterProps<Row>;
  tree: Filters.FilterTreeBuilderProps<Row>;
  header: Header.HeaderFilterOptions<Row>;
}) {
  return [
    Vue.h(Native.NativeEditableCell<Row>, props.cell),
    Vue.h(Native.NativeRowEditActions<Row>, props.row),
    Vue.h(Native.NativeBatchEditBar<Row>, props.batch),
    Vue.h(Native.NativeFilterField<Row>, props.field),
    Vue.h(Native.NativeChecklistFilter<Row>, props.checklist),
    Vue.h(Native.NativeFilterTree<Row>, props.tree),
    Vue.h(Native.NativeHeaderFilter<Row>, props.header),
  ];
}
export = render;
