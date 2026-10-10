import { rowDetail, tree } from "@adapttable/vue/features";
tree({ expandedIds: [1] });
rowDetail((row: { id: string }) => row.id, undefined, { expandedRowIds: [2] });
