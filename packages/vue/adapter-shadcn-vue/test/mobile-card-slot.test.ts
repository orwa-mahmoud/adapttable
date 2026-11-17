import { it } from "vitest";

import { mobileCardSlotTests } from "../../vue/test/kit/mobileCardSlot";
import { DataTable } from "../src";
import { rowDetail } from "../src/row-detail";

for (const test of mobileCardSlotTests({ DataTable, rowDetail }))
  it(test.name, test.run);
