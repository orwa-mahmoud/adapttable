import { tree } from "@adapttable/vue-unstyled/tree";
interface Person {
  id: string;
  name: string;
}
export const feature = tree<Person>({ expandedIds: [1] });
