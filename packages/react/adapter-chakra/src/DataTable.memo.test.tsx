import { it } from "vitest";

import { dataTableMemoTests } from "../../react/test/kit/suites/dataTableMemo";
import { kit } from "./data-table.test-utils";

for (const test of dataTableMemoTests(kit)) it(test.name, test.run);
