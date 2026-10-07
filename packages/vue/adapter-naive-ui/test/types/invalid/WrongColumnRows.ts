import type {
  ColumnMenu,
  ColumnMenuSlotProps,
} from "@adapttable/naive-ui/column-menu";

interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
declare const invoice: ColumnMenuSlotProps<Invoice>;
export const wrongRows: Parameters<typeof ColumnMenu<Person>>[0] = invoice;
