import { useDataTableShell } from "@adapttable/vue/adapter";
import { tree } from "@adapttable/vue/features";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  total: number;
  children?: readonly Invoice[];
}
const data: readonly Person[] = [];
useDataTableShell({
  data,
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  features: [tree({ getChildren: (row: Invoice) => row.children })],
});
