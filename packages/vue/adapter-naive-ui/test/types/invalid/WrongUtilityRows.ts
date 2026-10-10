import { exportCsv } from "@adapttable/naive-ui/export";
import type { TableFeature } from "@adapttable/vue";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  invoice: number;
}
export const invalid: TableFeature<Person> = exportCsv<Invoice>();
