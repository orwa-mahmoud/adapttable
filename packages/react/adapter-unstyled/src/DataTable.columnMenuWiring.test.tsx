import { it } from "vitest";

import { dataTableColumnMenuWiringTests } from "../../react/test/kit/suites/dataTableColumnMenuWiring";
import { kit } from "./data-table.test-utils";

for (const test of dataTableColumnMenuWiringTests(kit)) it(test.name, test.run);
