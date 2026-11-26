import Vue = require("vue");
import EditingKit = require("@adapttable/vue-unstyled/editing");
import Filters = require("@adapttable/vue-unstyled/filters");
import HeaderFilters = require("@adapttable/vue-unstyled/header-filters");
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
    Vue.h(EditingKit.NativeEditableCell<Row>, props.cell),
    Vue.h(EditingKit.NativeRowEditActions<Row>, props.row),
    Vue.h(EditingKit.NativeBatchEditBar<Row>, props.batch),
    Vue.h(Filters.NativeFilterField<Row>, props.field),
    Vue.h(Filters.ChecklistFilter<Row>, props.checklist),
    Vue.h(Filters.FilterTreeBuilder<Row>, props.tree),
    Vue.h(HeaderFilters.NativeHeaderFilter<Row>, props.header),
  ];
}
export = render;
