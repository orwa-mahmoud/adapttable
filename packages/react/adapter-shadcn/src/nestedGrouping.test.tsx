import { it } from "vitest";

import { nestedGroupingTests } from "../../react/test/kit/suites/nestedGrouping";
import { kit } from "./data-table.test-utils";

for (const test of nestedGroupingTests(kit)) it(test.name, test.run);
