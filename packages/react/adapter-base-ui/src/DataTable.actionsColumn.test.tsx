import { it } from "vitest";

import { dataTableActionsColumnTests } from "../../react/test/kit/suites/dataTableActionsColumn";
import { kit } from "./data-table.test-utils";

for (const test of dataTableActionsColumnTests(kit)) it(test.name, test.run);
