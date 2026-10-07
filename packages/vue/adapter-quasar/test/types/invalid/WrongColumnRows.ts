import type { ColumnMenuSlotProps } from "@adapttable/quasar/column-menu";
interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
declare const invoice: ColumnMenuSlotProps<Invoice>;
export const person: ColumnMenuSlotProps<Person> = invoice;

export const columns: ColumnMenuSlotProps<Person>["allColumns"] = [
  { key: "name", accessor: (row: { id: number }) => row.id },
];
