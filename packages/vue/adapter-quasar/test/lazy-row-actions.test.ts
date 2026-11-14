import { Quasar } from "quasar";
import { it } from "vitest";

import { lazyRowActionsTests } from "../../vue/test/kit/lazyRowActions";
import DataTable from "../src/DataTable.vue";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import { ROW_ACTIONS_CONTROL } from "../src/rowActionsSlot";
import QuasarRowActions from "../src/table/QuasarRowActions.vue";

for (const test of lazyRowActionsTests({
  name: "Quasar",
  packageName: "@adapttable/quasar",
  DataTable,
  rowActions,
  rowPinning,
  controlKey: ROW_ACTIONS_CONTROL,
  RowActions: QuasarRowActions,
  install: (app) => app.use(Quasar, { config: {} }),
}))
  it(test.name, test.run);
