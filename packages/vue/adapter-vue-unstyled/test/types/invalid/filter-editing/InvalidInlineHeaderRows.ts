import type {
  FilterHeaderControlOptions,
  FilterHeaderRowProps,
} from "@adapttable/vue/adapter";
import type {
  FilterHeaderControl,
  FilterHeaderRow,
} from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
}
interface Invoice {
  id: string;
  amount: number;
}
declare const control: FilterHeaderControlOptions<Invoice>;
declare const row: FilterHeaderRowProps<Invoice>;
export const wrongControl: Parameters<typeof FilterHeaderControl<Person>>[0] =
  control;
export const wrongRow: Parameters<typeof FilterHeaderRow<Person>>[0] = row;
