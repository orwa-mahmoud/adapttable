import { useDataTableShell } from "@adapttable/vue/adapter";
import {
  grouping,
  nestedTable,
  rowDetail,
  tree,
} from "@adapttable/vue/features";
import { effectScope, h, shallowRef } from "vue";
interface Person {
  id: string;
  team: string;
  children?: readonly Person[];
}
const data: readonly Person[] = [{ id: "a", team: "Core" }];
const scope = effectScope();
scope.run(() => {
  const ids = shallowRef<readonly string[]>([]);
  const shell = useDataTableShell({
    data,
    columns: [{ key: "team" }],
    rowKey: (row) => row.id,
    features: [
      grouping("team", { groupFooters: true }),
      tree({ getChildren: (row: Person) => row.children, expandedIds: ids }),
      rowDetail((row: Person) => h("aside", row.team)),
      nestedTable((row: Person) => ({
        label: row.id,
        table: (defaults) => h("div", defaults.tableLabel),
      })),
    ],
  });
  shell.tree.value?.entries.forEach((entry) => entry.row.team.toUpperCase());
});
scope.stop();
