import { it } from "vitest";

import { groupFootersTests } from "../../react/test/kit/suites/groupFooters";
import { kit } from "./data-table.test-utils";

for (const test of groupFootersTests(kit)) it(test.name, test.run);
