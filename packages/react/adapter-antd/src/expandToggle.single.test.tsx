import { it } from "vitest";

import { expandToggleSingleTests } from "../../react/test/kit/suites/expandToggleSingle";
import { kit } from "./data-table.test-utils";

for (const test of expandToggleSingleTests(kit)) it(test.name, test.run);
