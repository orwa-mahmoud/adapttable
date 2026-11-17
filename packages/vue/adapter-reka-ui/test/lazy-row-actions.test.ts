import { describe, expect, it } from "vitest";

import { lazyRowActionsTests } from "../../vue/test/kit/lazyRowActions";
import { RekaRowActions } from "../src/controls/RekaRowActions";
import DataTable from "../src/DataTable.vue";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import { ROW_ACTIONS_CONTROL } from "../src/rowActionsSlot";
import {
  rowActions as aggregatedRowActions,
  rowPinning as aggregatedRowPinning,
} from "../src/rows";

for (const test of lazyRowActionsTests({
  name: "Reka UI",
  packageName: "@adapttable/reka-ui",
  DataTable,
  rowActions,
  rowPinning,
  controlKey: ROW_ACTIONS_CONTROL,
  RowActions: RekaRowActions,
}))
  it(test.name, test.run);

describe("optional native row-action presentation", () => {
  it("keeps aggregate row exports on the native presentation factories", () => {
    expect(aggregatedRowActions).toBe(rowActions);
    expect(aggregatedRowPinning).toBe(rowPinning);
  });
});
