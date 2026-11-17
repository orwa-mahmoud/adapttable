import { it } from "vitest";

import { dataTableAnimateTests } from "../../react/test/kit/suites/dataTableAnimate";
import { kit } from "./data-table.test-utils";

for (const test of dataTableAnimateTests(kit)) it(test.name, test.run);
