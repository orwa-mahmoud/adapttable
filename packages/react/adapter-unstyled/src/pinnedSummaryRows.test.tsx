import { it } from "vitest";

import { pinnedSummaryRowsTests } from "../../react/test/kit/suites/pinnedSummaryRows";
import { kit } from "./data-table.test-utils";

for (const test of pinnedSummaryRowsTests(kit)) it(test.name, test.run);
