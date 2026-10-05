import {
  standardFeatures,
  type TableFeature,
} from "@adapttable/vue-unstyled/preset";
interface Person {
  name: string;
}
interface Invoice {
  amount: number;
}
export const wrong: TableFeature<Person>[] = standardFeatures<Invoice>({
  filters: [
    { key: "amount", type: "numberRange", getValue: (row) => row.amount },
  ],
});
