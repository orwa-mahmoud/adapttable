import { it } from "vitest";

import { dataTableRowCountTests } from "../../react/test/kit/suites/dataTableRowCount";
import { kit } from "./data-table.test-utils";

for (const test of dataTableRowCountTests(kit)) it(test.name, test.run);
