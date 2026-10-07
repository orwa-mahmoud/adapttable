import { contextMenu } from "@adapttable/naive-ui/context-menu";
import type { TableFeature } from "@adapttable/vue";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  invoice: number;
}
export const invalid: TableFeature<Person> = contextMenu<Invoice>();
