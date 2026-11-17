import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";

import { lazyRowActionsTests } from "../../vue/test/kit/lazyRowActions";
import DataTable from "../src/DataTable.vue";
import { ElementRowActions } from "../src/ElementRowActions";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import { ROW_ACTIONS_CONTROL } from "../src/rowActionsSlot";
import {
  rowActions as aggregatedRowActions,
  rowPinning as aggregatedRowPinning,
} from "../src/rows";

for (const test of lazyRowActionsTests({
  name: "Element Plus",
  packageName: "@adapttable/element-plus",
  DataTable,
  rowActions,
  rowPinning,
  controlKey: ROW_ACTIONS_CONTROL,
  RowActions: ElementRowActions,
  install: (app) => {
    app.provide(ID_INJECTION_KEY, { prefix: 5100, current: 0 });
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  },
}))
  it(test.name, test.run);

describe("optional native row-action presentation", () => {
  it("keeps aggregate row exports on the native presentation factories", () => {
    expect(aggregatedRowActions).toBe(rowActions);
    expect(aggregatedRowPinning).toBe(rowPinning);
  });
});
