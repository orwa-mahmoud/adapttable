import type { SummaryRowFn } from "@adapttable/vue-unstyled";
interface Row {
  id: string;
}
export const summary: SummaryRowFn<Row> = () => ({ id: new Date() });
