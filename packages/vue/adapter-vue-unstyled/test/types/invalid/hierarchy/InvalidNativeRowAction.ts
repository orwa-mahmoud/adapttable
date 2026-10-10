import { rowActions } from "@adapttable/vue-unstyled/row-actions";
interface Person {
  id: string;
  name: string;
}
export const feature = rowActions<Person>([
  {
    key: "read",
    label: "Read",
    onClick: (row: { amount: number }) => row.amount,
  },
]);
