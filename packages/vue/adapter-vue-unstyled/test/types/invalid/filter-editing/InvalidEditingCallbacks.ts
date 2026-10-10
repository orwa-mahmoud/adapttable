import {
  batchEditing,
  editHistory,
  editing,
  rowEditing,
} from "@adapttable/vue-unstyled/editing";
import { filters } from "@adapttable/vue-unstyled/filters";
interface Person {
  id: string;
  name: string;
}
editing<Person>((row: number) => row.toFixed());
rowEditing<Person>((row: number) => row.toFixed());
batchEditing<Person>((changes: string) => changes.toUpperCase());
filters<Person>([], { mode: "floating" });
editHistory({ depth: "many" });
