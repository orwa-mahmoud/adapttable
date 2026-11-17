import { it } from "vitest";

import { columnVirtualizationTests } from "../../react/test/kit/suites/columnVirtualization";
import { kit } from "./data-table.test-utils";

for (const test of columnVirtualizationTests(kit)) it(test.name, test.run);
