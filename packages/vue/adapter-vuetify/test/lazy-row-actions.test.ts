import { describe, expect, it } from "vitest";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { lazyRowActionsTests } from "../../vue/test/kit/lazyRowActions";
import DataTable from "../src/DataTable.vue";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import RowActions from "../src/RowActions.vue";
import { ROW_ACTIONS_CONTROL } from "../src/rowActionsSlot";
import {
  rowActions as aggregatedRowActions,
  rowPinning as aggregatedRowPinning,
} from "../src/rows";

for (const test of lazyRowActionsTests({
  name: "Vuetify",
  packageName: "@adapttable/vuetify",
  DataTable,
  rowActions,
  rowPinning,
  controlKey: ROW_ACTIONS_CONTROL,
  RowActions: RowActions,
  install: (app) =>
    app.use(
      createVuetify({
        ssr: true,
        icons: { defaultSet: "mdi", aliases, sets: { mdi } },
      })
    ),
}))
  it(test.name, test.run);

describe("optional native row-action presentation", () => {
  it("keeps aggregate row exports on the native presentation factories", () => {
    expect(aggregatedRowActions).toBe(rowActions);
    expect(aggregatedRowPinning).toBe(rowPinning);
  });
});
