import { grouping } from "@adapttable/vue-unstyled/grouping";
import { nestedTable } from "@adapttable/vue-unstyled/nested-table";
import { rowDetail } from "@adapttable/vue-unstyled/row-detail";
import { tree } from "@adapttable/vue-unstyled/tree";

interface Row {
  id: string;
  team: string;
}

grouping<Row>("team", { enabled: false });
tree<Row>({ getParentId: () => undefined, enabled: false });
rowDetail<Row>((row) => row.id, [], { enabled: false });
nestedTable<Row>(() => undefined, [], { enabled: false });
