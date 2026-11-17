import { it } from "vitest";

import { lazyRowActionsTests } from "../../vue/test/kit/lazyRowActions";
import DataTable from "../src/DataTable.vue";
import NaiveRowActions from "../src/NaiveRowActions.vue";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import { ROW_ACTIONS_CONTROL } from "../src/rowActionsSlot";

for (const test of lazyRowActionsTests({
  name: "Naive UI",
  packageName: "@adapttable/naive-ui",
  DataTable,
  rowActions,
  rowPinning,
  controlKey: ROW_ACTIONS_CONTROL,
  RowActions: NaiveRowActions,
}))
  it(test.name, test.run);
