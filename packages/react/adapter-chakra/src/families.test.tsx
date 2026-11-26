import { it } from "vitest";

import { familiesTests } from "../../react/test/kit/suites/families";
import { kit } from "./data-table.test-utils";

for (const test of familiesTests(kit)) it(test.name, test.run);
