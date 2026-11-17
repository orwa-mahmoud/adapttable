import { it } from "vitest";

import { toolbarOrderTests } from "../../react/test/kit/suites/toolbarOrder";
import { kit } from "./data-table.test-utils";

for (const test of toolbarOrderTests(kit)) it(test.name, test.run);
