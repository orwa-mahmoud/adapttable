import { groupingPanel } from "@adapttable/naive-ui/grouping-panel";
import { rowReorder } from "@adapttable/naive-ui/row-reorder";
import type { TableFeature } from "@adapttable/vue";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  invoice: number;
}
export const group: TableFeature<Person> = groupingPanel<Invoice>();
export const row: TableFeature<Person> = rowReorder<Invoice>(() => undefined);
