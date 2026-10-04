import {
  grouping,
  nestedTable,
  rowDetail,
  tree,
} from "@adapttable/vue/features";

interface Row {
  id: string;
  team: string;
}

grouping<Row>("team", { enabled: false });
tree<Row>({ getParentId: () => undefined, enabled: false });
rowDetail<Row>((row) => row.id, [], { enabled: false });
nestedTable<Row>(() => undefined, [], { enabled: false });
