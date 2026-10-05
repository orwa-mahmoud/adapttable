import type { ColumnMenuSlotProps } from "@adapttable/vue/column-menu";
interface Person {
  readonly name: string;
}
interface Invoice {
  readonly amount: number;
}
export function consume(
  props: ColumnMenuSlotProps<Person>
): ColumnMenuSlotProps<Invoice> {
  return props;
}
