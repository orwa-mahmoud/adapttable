import {
  batchEditing,
  editing,
  rowEditing,
} from "@adapttable/naive-ui/editing";
import type { TableFeature } from "@adapttable/vue";
interface Person {
  id: string;
  name: string;
}
interface Order {
  orderId: number;
}
export const cell: TableFeature<Person> = editing<Order>(() => undefined);
export const row: TableFeature<Person> = rowEditing<Order>(() => undefined);
export const batch: TableFeature<Person> = batchEditing<Order>(() => undefined);
